export type UpcLookupResult = {
  title: string;
  subtitle?: string | null;
  brand?: string | null;
  format?: string | null;
  imageUrl?: string | null;
  source: string;
  raw?: unknown;
};

type UpcItemDbItem = {
  title?: string;
  description?: string;
  brand?: string;
  images?: string[];
};

type UpcItemDbResponse = {
  code?: string;
  items?: UpcItemDbItem[];
};

const LOOKUP_TIMEOUT_MS = 6500;

const KNOWN_DVD_UPCS: Record<string, UpcLookupResult> = {
  '085393894825': {
    title: "Ocean's Eleven",
    brand: 'Warner Home Video',
    format: 'DVD',
    source: 'dvd-valet-known-dvd',
  },
};

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timeoutId),
  };
}

function cleanText(value?: string | null) {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim();
  return cleaned || null;
}

function normalizeUpc(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function itemToResult(item: UpcItemDbItem, raw: unknown): UpcLookupResult | null {
  const title = cleanText(item.title);
  if (!title) return null;

  return {
    title,
    subtitle: cleanText(item.description),
    brand: cleanText(item.brand),
    format: 'DVD',
    imageUrl: item.images?.find(Boolean) ?? null,
    source: 'upcitemdb',
    raw,
  };
}

async function lookupWithUpcItemDb(upc: string): Promise<UpcLookupResult | null> {
  const timeout = withTimeout(LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`,
      {
        headers: { Accept: 'application/json' },
        signal: timeout.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`UPC lookup returned ${response.status}`);
    }

    const payload = (await response.json()) as UpcItemDbResponse;
    const item = payload.items?.[0];
    if (!item) return null;
    return itemToResult(item, payload);
  } finally {
    timeout.cancel();
  }
}

export async function lookupDvdByUpc(upcRaw: string): Promise<UpcLookupResult | null> {
  const upc = normalizeUpc(upcRaw);
  if (!upc) return null;

  const knownMatch = KNOWN_DVD_UPCS[upc];
  if (knownMatch) return knownMatch;

  return lookupWithUpcItemDb(upc);
}
