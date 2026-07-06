#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultAppsPath = path.resolve(__dirname, '../google-play/apps.json');
const defaultKeyPath = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY
  || '/Users/tompinataro/.secrets/bloom-steward-54198e4de0f4.json';

function usage() {
  console.log(`Usage:
  node control/tools/google-play.mjs access [--apps path] [--key path]
  node control/tools/google-play.mjs details <package> [--key path]
  node control/tools/google-play.mjs tracks <package> [--key path]
  node control/tools/google-play.mjs patch-details <package> [--contactWebsite url] [--contactEmail email] [--key path]

Examples:
  node control/tools/google-play.mjs access
  node control/tools/google-play.mjs tracks com.tixpy.dvdvalet
  node control/tools/google-play.mjs patch-details com.tixpy.dvdvalet --contactWebsite https://example.com --contactEmail support@example.com
`);
}

function readArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      flags[key] = next && !next.startsWith('--') ? next : true;
      if (flags[key] === next) i += 1;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function loadKey(keyPath) {
  return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
}

function request(url, options = {}, body = '') {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const parsed = (() => {
          try {
            return JSON.parse(data);
          } catch {
            return data;
          }
        })();
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function signJwt(key) {
  const now = Math.floor(Date.now() / 1000);
  const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = [
    base64url({ alg: 'RS256', typ: 'JWT' }),
    base64url({
      iss: key.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  ].join('.');
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');
  return `${unsigned}.${signature}`;
}

async function getAccessToken(key) {
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: signJwt(key),
  }).toString();
  const response = await request('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'content-length': Buffer.byteLength(body),
    },
  }, body);

  if (response.status !== 200) {
    throw new Error(`Token request failed (${response.status}): ${JSON.stringify(response.data)}`);
  }
  return response.data.access_token;
}

class AndroidPublisher {
  constructor(token) {
    this.headers = { authorization: `Bearer ${token}` };
  }

  api(pathname, method = 'GET', body = undefined) {
    const payload = body === undefined ? '' : JSON.stringify(body);
    return request(`https://androidpublisher.googleapis.com/androidpublisher/v3${pathname}`, {
      method,
      headers: {
        ...this.headers,
        ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
      },
    }, payload);
  }

  async createEdit(packageName) {
    const response = await this.api(`/applications/${packageName}/edits`, 'POST');
    if (response.status !== 200) throw new Error(`${packageName}: create edit failed (${response.status}): ${JSON.stringify(response.data)}`);
    return response.data.id;
  }

  deleteEdit(packageName, editId) {
    return this.api(`/applications/${packageName}/edits/${editId}`, 'DELETE');
  }

  commitEdit(packageName, editId) {
    return this.api(`/applications/${packageName}/edits/${editId}:commit`, 'POST');
  }

  async withEdit(packageName, callback, { commit = false } = {}) {
    const editId = await this.createEdit(packageName);
    try {
      const result = await callback(editId);
      if (commit) {
        const committed = await this.commitEdit(packageName, editId);
        if (committed.status !== 200) throw new Error(`${packageName}: commit failed (${committed.status}): ${JSON.stringify(committed.data)}`);
      } else {
        await this.deleteEdit(packageName, editId);
      }
      return result;
    } catch (error) {
      await this.deleteEdit(packageName, editId).catch(() => {});
      throw error;
    }
  }

  details(packageName, editId) {
    return this.api(`/applications/${packageName}/edits/${editId}/details`);
  }

  tracks(packageName, editId) {
    return this.api(`/applications/${packageName}/edits/${editId}/tracks`);
  }

  patchDetails(packageName, editId, body) {
    return this.api(`/applications/${packageName}/edits/${editId}/details`, 'PATCH', body);
  }
}

async function main() {
  const { positional, flags } = readArgs(process.argv.slice(2));
  const command = positional[0];
  if (!command || flags.help || flags.h) {
    usage();
    return;
  }

  const key = loadKey(flags.key || defaultKeyPath);
  const play = new AndroidPublisher(await getAccessToken(key));

  if (command === 'access') {
    const apps = JSON.parse(fs.readFileSync(flags.apps || defaultAppsPath, 'utf8'));
    const rows = [];
    for (const app of apps) {
      try {
        await play.withEdit(app.packageName, async () => undefined);
        rows.push({ name: app.name, packageName: app.packageName, status: 'ok' });
      } catch (error) {
        rows.push({ name: app.name, packageName: app.packageName, status: 'error', message: error.message });
      }
    }
    console.table(rows);
    return;
  }

  const packageName = positional[1];
  if (!packageName) throw new Error(`${command} requires a package name`);

  if (command === 'details') {
    const result = await play.withEdit(packageName, async (editId) => play.details(packageName, editId));
    console.log(JSON.stringify(result.data, null, 2));
    return;
  }

  if (command === 'tracks') {
    const result = await play.withEdit(packageName, async (editId) => play.tracks(packageName, editId));
    console.log(JSON.stringify(result.data, null, 2));
    return;
  }

  if (command === 'patch-details') {
    const body = {};
    if (flags.contactWebsite) body.contactWebsite = flags.contactWebsite;
    if (flags.contactEmail) body.contactEmail = flags.contactEmail;
    if (!Object.keys(body).length) throw new Error('patch-details requires --contactWebsite and/or --contactEmail');
    const result = await play.withEdit(packageName, async (editId) => {
      const patched = await play.patchDetails(packageName, editId, body);
      if (patched.status !== 200) throw new Error(`${packageName}: patch details failed (${patched.status}): ${JSON.stringify(patched.data)}`);
      return patched;
    }, { commit: true });
    console.log(JSON.stringify(result.data, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
