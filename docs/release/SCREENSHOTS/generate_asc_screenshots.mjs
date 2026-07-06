import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputRoot = path.join(__dirname, 'ASC_READY');
const { chromium } = await import(path.join(__dirname, '../../../mobile/node_modules/playwright/index.mjs'));

const screens = [
  {
    id: 'library-preview',
    width: 1242,
    height: 2688,
    output: path.join(outputRoot, 'iphone-6.5', '01-library-preview.png'),
    html: `
      <div class="phone">
        ${header('Library', 'Profile')}
        <section class="content">
          <div class="header-row">
            <div>
              <div class="section-title">DVD Library</div>
              <div class="section-copy">Saved UPCs appear here after they are scanned.</div>
            </div>
            <button class="ghost">Refresh</button>
          </div>
          <div class="card hero">
            <div class="kicker">Start your collection</div>
            <h1>Your library is empty</h1>
            <p>Add your first DVD to start building your collection. No account or invitation is required.</p>
            <button class="primary">Add your first DVD</button>
          </div>
          <div class="sample-heading">Sample library preview</div>
          <div class="sample-card">
            <span class="badge">Example</span>
            <div class="sample-title">The Grand Adventure</div>
            <div class="sample-meta">DVD · Example title preview</div>
          </div>
          <div class="sample-card">
            <span class="badge">Example</span>
            <div class="sample-title">Classic Cinema Collection</div>
            <div class="sample-meta">Box Set · Example library card</div>
          </div>
          <div class="sample-card">
            <span class="badge">Example</span>
            <div class="sample-title">Family Movie Night</div>
            <div class="sample-meta">Blu-ray · Appears here after scanning</div>
          </div>
        </section>
        ${tabBar('library')}
      </div>
    `,
  },
  {
    id: 'library-tip',
    width: 1242,
    height: 2688,
    output: path.join(outputRoot, 'iphone-6.5', '02-library-tip.png'),
    html: `
      <div class="phone">
        ${header('Library', 'Profile')}
        <section class="content">
          <div class="header-row">
            <div>
              <div class="section-title">DVD Library</div>
              <div class="section-copy">Saved UPCs appear here after they are scanned.</div>
            </div>
            <button class="ghost">Refresh</button>
          </div>
          <div class="card hero muted">
            <div class="kicker">Start your collection</div>
            <h1>Your library is empty</h1>
            <p>Add your first DVD to start building your collection. No account or invitation is required.</p>
          </div>
          <div class="modal-backdrop"></div>
          <div class="modal">
            <div class="kicker">DVD Valet Tip</div>
            <h2>Your DVD library contents will appear here</h2>
            <p>Add them with one tap from your camera on the Scan tab. No account or invitation is required to start.</p>
            <button class="secondary">Got it</button>
            <button class="primary">Open scanner</button>
          </div>
        </section>
        ${tabBar('library')}
      </div>
    `,
  },
  {
    id: 'scan-ready',
    width: 1242,
    height: 2688,
    output: path.join(outputRoot, 'iphone-6.5', '03-scan-ready.png'),
    html: `
      <div class="phone">
        ${header('Scan', 'Profile')}
        <section class="content">
          <div class="scan-top">
            <div class="scan-title">Batch Scan · Saved: 12</div>
            <div class="button-row">
              <button class="ghost">Done</button>
              <button class="ghost">Reset</button>
            </div>
          </div>
          <div class="scan-frame"></div>
          <div class="scan-label">Aim the UPC inside the box to add titles to your library. Duplicates are ignored.</div>
          <div class="footer-card">
            <div class="section-title">Recent scans</div>
            <div class="queue-item"><span>043396553515</span><span>Saved</span></div>
            <div class="queue-item"><span>043396567130</span><span>Saved</span></div>
            <div class="queue-item"><span>025192364820</span><span>Saved</span></div>
          </div>
        </section>
        ${tabBar('scan')}
      </div>
    `,
  },
  {
    id: 'scan-saved',
    width: 1242,
    height: 2688,
    output: path.join(outputRoot, 'iphone-6.5', '04-scan-saved.png'),
    html: `
      <div class="phone">
        ${header('Scan', 'Profile')}
        <section class="content">
          <div class="scan-top">
            <div class="scan-title">Batch Scan · Saved: 13</div>
            <div class="button-row">
              <button class="ghost">Done</button>
              <button class="ghost">Reset</button>
            </div>
          </div>
          <div class="scan-frame active"></div>
          <div class="toast">Saved: 043396612724</div>
          <div class="scan-label">Use the scanner to capture DVD UPC barcodes while cataloging your collection.</div>
          <div class="footer-card">
            <div class="section-title">Recent captures</div>
            <div class="queue-item"><span>043396612724</span><span>Just now</span></div>
            <div class="queue-item"><span>043396567130</span><span>2 min ago</span></div>
            <div class="queue-item"><span>025192364820</span><span>5 min ago</span></div>
          </div>
        </section>
        ${tabBar('scan')}
      </div>
    `,
  },
  {
    id: 'ipad-overview',
    width: 2048,
    height: 2732,
    output: path.join(outputRoot, 'ipad-13', 'ipad-13-library.png'),
    html: `
      <div class="ipad">
        <div class="ipad-shell">
          <div class="sidebar">
            <div class="brand">DVD Valet</div>
            <div class="nav-item active">Library</div>
            <div class="nav-item">Scan</div>
            <div class="nav-item">Support</div>
          </div>
          <div class="main">
            <div class="main-top">
              <div>
                <div class="kicker">Queued catalog</div>
                <h1>Track incoming DVDs in one place</h1>
              </div>
              <button class="primary wide">Open scanner</button>
            </div>
            <div class="ipad-grid">
              <div class="card metric">
                <div class="metric-label">Queued discs</div>
                <div class="metric-value">13</div>
                <div class="metric-copy">Recently scanned and ready for review</div>
              </div>
              <div class="card metric">
                <div class="metric-label">Last sync</div>
                <div class="metric-value">2 min</div>
                <div class="metric-copy">Library refreshed from local storage</div>
              </div>
            </div>
            <div class="card list-card">
              <div class="section-title">Recent DVD captures</div>
              <div class="queue-item"><span>043396612724 · Family Movie Night</span><span>Just now</span></div>
              <div class="queue-item"><span>043396567130 · Classic Cinema Collection</span><span>2 min ago</span></div>
              <div class="queue-item"><span>025192364820 · The Grand Adventure</span><span>5 min ago</span></div>
              <div class="queue-item"><span>043396553515 · Documentary Feature</span><span>11 min ago</span></div>
            </div>
          </div>
        </div>
      </div>
    `,
  },
];

function statusBar() {
  return ``;
}

function header(title, actionLabel) {
  return `
    <header class="top-header">
      <div class="title">${title}</div>
      <button class="ghost">${actionLabel}</button>
    </header>
  `;
}

function tabBar(active) {
  return `
    <nav class="tab-bar">
      <div class="tab ${active === 'scan' ? 'active' : ''}">
        <div class="tab-icon">⌁</div>
        <div class="tab-label">Scan</div>
      </div>
      <div class="tab ${active === 'library' ? 'active' : ''}">
        <div class="tab-icon">▤</div>
        <div class="tab-label">Library</div>
      </div>
    </nav>
  `;
}

function renderDocument() {
  const style = `
    <style>
      :root {
        color-scheme: dark;
        --bg: #0b0b0f;
        --card: #12121a;
        --card-muted: #15151f;
        --line: #242431;
        --line-strong: #2d2d3e;
        --text: #ffffff;
        --muted: #c9c9d1;
        --subtle: #9a9ab0;
        --gold: #f7e7b1;
        --accent: #5f162d;
        --accent-strong: #7c1f3a;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #101014;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
      }
      .stage {
        display: grid;
        gap: 48px;
        padding: 48px;
        justify-content: start;
      }
      .phone, .ipad {
        position: relative;
        overflow: hidden;
        background: var(--bg);
        color: var(--text);
      }
      .phone {
        width: 1242px;
        height: 2688px;
      }
      .ipad {
        width: 2048px;
        height: 2732px;
        padding: 72px 72px 0;
      }
      .status-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 78px 96px 24px;
        font-size: 42px;
        font-weight: 700;
      }
      .dynamic-island {
        width: 370px;
        height: 110px;
        border-radius: 999px;
        background: #020204;
      }
      .status-right {
        display: flex;
        align-items: center;
        gap: 18px;
      }
      .top-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 54px 26px;
      }
      .title {
        font-size: 58px;
        font-weight: 800;
        letter-spacing: -0.03em;
      }
      .content {
        padding: 8px 54px 250px;
      }
      .header-row,
      .scan-top,
      .main-top,
      .ipad-grid {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 28px;
      }
      .section-title,
      .sample-heading,
      .scan-title,
      .metric-label {
        font-size: 42px;
        font-weight: 800;
      }
      .section-copy,
      .card p,
      .scan-label,
      .metric-copy,
      .sample-meta {
        color: var(--muted);
        font-size: 30px;
        line-height: 1.45;
      }
      .card {
        border: 3px solid var(--line);
        border-radius: 42px;
        background: var(--card);
        padding: 42px;
      }
      .hero {
        margin-top: 38px;
      }
      .hero h1,
      .modal h2,
      .main h1 {
        margin: 12px 0 18px;
        font-size: 68px;
        line-height: 1.05;
        letter-spacing: -0.04em;
      }
      .kicker {
        color: var(--gold);
        font-size: 24px;
        font-weight: 800;
        letter-spacing: 0.24em;
        text-transform: uppercase;
      }
      .sample-heading {
        margin: 42px 0 22px;
      }
      .sample-card {
        position: relative;
        border: 3px solid var(--line);
        border-radius: 32px;
        background: var(--card);
        padding: 34px 34px 28px;
        margin-bottom: 22px;
      }
      .badge {
        display: inline-block;
        padding: 10px 18px;
        border-radius: 999px;
        background: rgba(247, 231, 177, 0.12);
        color: var(--gold);
        font-size: 20px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .sample-title {
        margin-top: 20px;
        font-size: 40px;
        font-weight: 800;
      }
      button {
        appearance: none;
        border: 0;
        cursor: default;
        font: inherit;
      }
      .primary, .secondary, .ghost, .wide {
        border-radius: 28px;
        padding: 24px 32px;
        font-size: 28px;
        font-weight: 800;
      }
      .primary, .wide {
        color: #fff;
        background: var(--accent);
      }
      .secondary, .ghost {
        color: #fff;
        background: transparent;
        border: 3px solid var(--line-strong);
      }
      .primary { margin-top: 24px; width: 100%; }
      .button-row {
        display: flex;
        gap: 16px;
      }
      .scan-frame {
        margin: 150px auto 180px;
        width: 86%;
        height: 840px;
        border-radius: 50px;
        border: 6px solid rgba(255, 255, 255, 0.82);
        background:
          linear-gradient(rgba(255,255,255,0.04), rgba(255,255,255,0.02)),
          radial-gradient(circle at center, rgba(95, 22, 45, 0.18), transparent 62%);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
      }
      .scan-frame.active {
        box-shadow:
          0 0 0 8px rgba(247, 231, 177, 0.12),
          inset 0 0 0 1px rgba(255,255,255,0.06);
      }
      .footer-card {
        margin-top: 80px;
        border: 3px solid var(--line);
        border-radius: 38px;
        background: var(--card);
        padding: 34px;
      }
      .queue-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 26px 0;
        border-top: 2px solid rgba(255, 255, 255, 0.08);
        font-size: 28px;
        color: var(--text);
      }
      .queue-item:first-of-type {
        border-top: 0;
      }
      .toast {
        width: fit-content;
        margin: -70px auto 80px;
        padding: 24px 36px;
        border-radius: 999px;
        background: rgba(95, 22, 45, 0.96);
        color: white;
        font-size: 28px;
        font-weight: 800;
      }
      .modal-backdrop {
        position: absolute;
        inset: 330px 0 180px;
        background: rgba(0, 0, 0, 0.68);
      }
      .modal {
        position: absolute;
        left: 54px;
        right: 54px;
        top: 720px;
        border: 3px solid var(--line-strong);
        border-radius: 42px;
        background: var(--card);
        padding: 44px;
      }
      .modal .secondary,
      .modal .primary {
        width: 100%;
        margin-top: 18px;
      }
      .muted {
        opacity: 0.45;
      }
      .tab-bar {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 188px;
        border-top: 3px solid var(--line);
        background: rgba(18, 18, 26, 0.98);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 240px;
      }
      .tab {
        text-align: center;
        color: var(--subtle);
      }
      .tab.active { color: var(--gold); }
      .tab-icon {
        font-size: 44px;
        margin-bottom: 8px;
      }
      .tab-label {
        font-size: 24px;
        font-weight: 700;
      }
      .ipad-status {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 34px;
        font-weight: 700;
        margin-bottom: 40px;
        color: #d8d8e0;
      }
      .ipad-shell {
        display: grid;
        grid-template-columns: 340px 1fr;
        gap: 42px;
        height: 2500px;
      }
      .sidebar {
        border: 3px solid var(--line);
        border-radius: 42px;
        background: var(--card);
        padding: 34px;
      }
      .brand {
        font-size: 44px;
        font-weight: 900;
        margin-bottom: 34px;
      }
      .nav-item {
        padding: 20px 22px;
        border-radius: 24px;
        color: var(--muted);
        font-size: 30px;
        font-weight: 700;
        margin-bottom: 12px;
      }
      .nav-item.active {
        color: var(--text);
        background: rgba(95, 22, 45, 0.45);
      }
      .main {
        border: 3px solid var(--line);
        border-radius: 42px;
        background: var(--bg);
        padding: 44px;
      }
      .wide {
        min-width: 320px;
      }
      .ipad-grid {
        margin-top: 32px;
        gap: 32px;
      }
      .metric {
        flex: 1;
        min-height: 260px;
      }
      .metric-value {
        margin: 20px 0 14px;
        font-size: 92px;
        font-weight: 900;
        letter-spacing: -0.05em;
      }
      .list-card {
        margin-top: 32px;
      }
    </style>
  `;

  const bodies = screens
    .map(
      (screen) => `
        <section id="${screen.id}" class="artboard">
          ${screen.html}
        </section>
      `
    )
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8" />${style}</head><body><main class="stage">${bodies}</main></body></html>`;
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 2200, height: 14000 }, deviceScaleFactor: 1 });
  await page.setContent(renderDocument());

  for (const screen of screens) {
    await mkdir(path.dirname(screen.output), { recursive: true });
    await page.locator(`#${screen.id} .phone, #${screen.id} .ipad`).first().screenshot({ path: screen.output });
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
