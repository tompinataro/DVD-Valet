const STORAGE_KEY = 'dvd-valet-web-library-v1';
const SEED_KEY = 'dvd-valet-web-library-seeded-v1';
const DAY_MS = 24 * 60 * 60 * 1000;
const STARTER_DVDS = [
  {
    upc: '085393894825',
    title: "Ocean's Eleven",
    format: 'DVD',
    brand: 'Warner Home Video',
  },
  {
    upc: '085391163922',
    title: 'The Matrix',
    format: 'DVD',
    brand: 'Warner Home Video',
  },
  {
    upc: '786936233711',
    title: 'Finding Nemo',
    format: 'DVD',
    brand: 'Pixar / Disney',
  },
  {
    upc: '794043554529',
    title: 'The Lord of the Rings: The Fellowship of the Ring',
    format: 'DVD',
    brand: 'New Line Home Video',
  },
];
const KNOWN_DVDS = {
  '085393894825': {
    title: "Ocean's Eleven",
    format: 'DVD',
    brand: 'Warner Home Video',
    lookup_source: 'dvd-valet-known-dvd',
  },
};

const state = {
  items: loadLibrary(),
  stream: null,
  detector: null,
  scanTimer: null,
  scanLocked: false,
};

const views = Array.from(document.querySelectorAll('header.hero, main > section'));
const libraryList = document.querySelector('#library-list');
const manualForm = document.querySelector('#manual-form');
const manualUpc = document.querySelector('#manual-upc');
const cameraStatus = document.querySelector('#camera-status');
const cameraPreview = document.querySelector('#camera-preview');

document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => showView(button.dataset.view));
});

document.querySelector('#refresh-library').addEventListener('click', renderLibrary);
document.querySelector('#export-csv').addEventListener('click', exportCsv);
document.querySelector('#start-camera').addEventListener('click', startCamera);
document.querySelector('#stop-camera').addEventListener('click', stopCamera);

manualForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await saveScannedUpc(manualUpc.value, 'manual');
  manualUpc.value = '';
});

renderLibrary();

function showView(id) {
  views.forEach((view) => {
    view.classList.toggle('hidden', view.id !== id);
  });

  if (id === 'library-view') renderLibrary();
  if (id !== 'scan-view') stopCamera();
}

function loadLibrary() {
  try {
    const savedRaw = localStorage.getItem(STORAGE_KEY);
    const seeded = localStorage.getItem(SEED_KEY) === 'true';
    const saved = savedRaw ? JSON.parse(savedRaw) : [];
    if (Array.isArray(saved) && (saved.length > 0 || seeded)) return saved;

    const starterDvds = makeStarterDvds();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(starterDvds));
    localStorage.setItem(SEED_KEY, 'true');
    return starterDvds;
  } catch {
    return makeStarterDvds();
  }
}

function makeStarterDvds() {
  const now = Date.now();
  return STARTER_DVDS.map((dvd, index) => {
    const scannedAt = new Date(now - (index + 1) * DAY_MS).toISOString();
    return {
      ...dvd,
      lookup_status: 'found',
      lookup_source: 'dvd-valet-starter',
      first_scanned_at: scannedAt,
      last_scanned_at: scannedAt,
    };
  });
}

function persistLibrary() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function normalizeUpc(rawValue) {
  return String(rawValue || '').replace(/\D/g, '');
}

function isValidUpc(upc) {
  return /^(?:\d{8}|\d{12}|\d{13})$/.test(upc);
}

async function lookupDvd(upc) {
  if (KNOWN_DVDS[upc]) {
    return KNOWN_DVDS[upc];
  }

  try {
    const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Lookup returned ${response.status}`);
    const payload = await response.json();
    const item = payload.items?.[0];
    if (!item?.title) return null;
    return {
      title: item.title,
      format: 'DVD',
      brand: item.brand || '',
      lookup_source: 'upcitemdb',
    };
  } catch {
    return null;
  }
}

async function saveScannedUpc(rawValue, source) {
  const upc = normalizeUpc(rawValue);
  if (!isValidUpc(upc)) {
    setCameraStatus('Enter or scan a valid UPC/EAN barcode.');
    return;
  }

  const now = new Date().toISOString();
  const existing = state.items.find((item) => item.upc === upc);
  const metadata = await lookupDvd(upc);

  if (existing) {
    existing.last_scanned_at = now;
    if (metadata) applyMetadata(existing, metadata);
  } else {
    const item = {
      upc,
      title: '',
      format: '',
      brand: '',
      lookup_status: 'not_found',
      lookup_source: '',
      first_scanned_at: now,
      last_scanned_at: now,
    };
    if (metadata) applyMetadata(item, metadata);
    state.items.unshift(item);
  }

  persistLibrary();
  renderLibrary();
  setCameraStatus(`${metadata?.title || `UPC ${upc}`} saved from ${source}.`);
}

function applyMetadata(item, metadata) {
  item.title = metadata.title || item.title;
  item.format = metadata.format || item.format;
  item.brand = metadata.brand || item.brand;
  item.lookup_status = 'found';
  item.lookup_source = metadata.lookup_source || item.lookup_source;
}

function renderLibrary() {
  libraryList.replaceChildren();
  if (!state.items.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Your library is empty. Scan or manually enter a DVD UPC to begin.';
    libraryList.append(empty);
    return;
  }

  const template = document.querySelector('#dvd-row-template');
  state.items.forEach((item) => {
    const row = template.content.firstElementChild.cloneNode(true);
    const card = row.querySelector('.dvd-card');
    row.querySelector('h3').textContent = item.title || 'UPC saved';
    row.querySelector('.dvd-upc').textContent = `UPC ${item.upc}`;
    row.querySelector('.dvd-meta').textContent = buildMeta(item);
    row.querySelector('.delete-rail button').addEventListener('click', () => confirmDelete(item));
    addSwipe(card);
    libraryList.append(row);
  });
}

function buildMeta(item) {
  if (item.lookup_status === 'found') {
    return [item.format, item.brand || item.lookup_source].filter(Boolean).join(' · ');
  }
  return item.lookup_status === 'not_found' ? 'No title match found yet.' : 'Title lookup pending.';
}

function addSwipe(card) {
  let startX = 0;
  card.addEventListener('pointerdown', (event) => {
    startX = event.clientX;
  });
  card.addEventListener('pointerup', (event) => {
    const delta = event.clientX - startX;
    if (delta < -42) card.classList.add('open');
    if (delta > 24) card.classList.remove('open');
  });
}

function confirmDelete(item) {
  const name = item.title || `UPC ${item.upc}`;
  if (!window.confirm(`Delete ${name} from Mike's DVD Library?`)) return;
  state.items = state.items.filter((candidate) => candidate.upc !== item.upc);
  persistLibrary();
  renderLibrary();
}

function exportCsv() {
  if (!state.items.length) {
    window.alert('Scan DVDs first, then export Mike\'s library as CSV.');
    return;
  }

  const headers = ['title', 'upc', 'format', 'brand', 'lookup_status', 'lookup_source', 'last_scanned_at', 'first_scanned_at'];
  const rows = state.items.map((item) => headers.map((key) => csvCell(item[key])).join(','));
  const csv = [headers.map(csvCell).join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dvd-valet-library-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

async function startCamera() {
  if (!('BarcodeDetector' in window)) {
    setCameraStatus('This browser does not support camera barcode detection yet. Use Manual UPC.');
    return;
  }

  try {
    state.detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    cameraPreview.srcObject = state.stream;
    await cameraPreview.play();
    setCameraStatus('Aim the UPC inside the box.');
    scanFrame();
  } catch (error) {
    setCameraStatus(`Camera unavailable: ${error.message || error}`);
  }
}

function stopCamera() {
  if (state.scanTimer) clearTimeout(state.scanTimer);
  state.scanTimer = null;
  state.scanLocked = false;
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
  }
  state.stream = null;
  cameraPreview.srcObject = null;
}

async function scanFrame() {
  if (!state.stream || !state.detector || state.scanLocked) return;

  try {
    const codes = await state.detector.detect(cameraPreview);
    const value = codes.find((code) => code.rawValue)?.rawValue;
    if (value) {
      state.scanLocked = true;
      await saveScannedUpc(value, 'camera');
      setTimeout(() => {
        state.scanLocked = false;
        scanFrame();
      }, 1400);
      return;
    }
  } catch {
    setCameraStatus('Camera scanner paused. Use Manual UPC if scanning does not resume.');
  }

  state.scanTimer = setTimeout(scanFrame, 350);
}

function setCameraStatus(message) {
  cameraStatus.textContent = message;
}
