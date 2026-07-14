import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult, BarcodeType } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import {
  countQueuedUpcs,
  ensureSchema,
  markUpcLookupFailed,
  markUpcLookupNotFound,
  saveUpcMetadata,
  upsertUpc,
} from '../../src/db';
import { lookupDvdByUpc } from '../../src/upcLookup';

const DVD_BARCODE_TYPES: BarcodeType[] = Platform.select({
  ios: ['ean13', 'upc_e', 'ean8'],
  default: ['upc_a', 'ean13', 'upc_e', 'ean8'],
});

type ScanStatus =
  | { kind: 'idle' }
  | { kind: 'scanning' }
  | { kind: 'saving'; upc: string }
  | { kind: 'saved'; upc: string; title?: string; lookupStatus: 'found' | 'not_found' | 'failed' }
  | { kind: 'error'; message: string };

function normalizeUpc(rawValue: string) {
  return String(rawValue || '').replace(/\D/g, '');
}

function isValidDvdUpc(value: string) {
  return /^(?:\d{8}|\d{12}|\d{13})$/.test(value);
}

function logScanner(message: string, data?: Record<string, unknown>) {
  const suffix = data ? ` ${JSON.stringify(data)}` : '';
  console.log(`[DVD Valet Scanner] ${message}${suffix}`);
}

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<ScanStatus>({ kind: 'idle' });
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualUpc, setManualUpc] = useState('');
  const lastUpcRef = useRef<string | null>(null);
  const scanLockRef = useRef(false);
  const toastTimerRef = useRef<any>(null);


  function recordScannerLog(message: string, data?: Record<string, unknown>) {
    logScanner(message, data);
  }

  useEffect(() => {
    ensureSchema()
      .then(() => countQueuedUpcs())
      .then(setQueuedCount)
      .catch(() => {
        // Startup errors surface when a save is attempted.
      });

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  function showSavedToast(
    upc: string,
    lookup: { title?: string; lookupStatus: 'found' | 'not_found' | 'failed' }
  ) {
    recordScannerLog('save complete', { upc, lookupStatus: lookup.lookupStatus, title: lookup.title });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setStatus({ kind: 'saved', upc, ...lookup });
    toastTimerRef.current = setTimeout(() => {
      scanLockRef.current = false;
      setStatus({ kind: 'scanning' });
    }, 1800);
  }

  async function saveScannedUpc(upc: string) {
    if (scanLockRef.current) {
      recordScannerLog('duplicate callback ignored', { upc, status: status.kind });
      return;
    }

    scanLockRef.current = true;
    lastUpcRef.current = upc;

    try {
      recordScannerLog('save started', { upc });
      setStatus({ kind: 'saving', upc });
      await upsertUpc(upc);
      const newCount = await countQueuedUpcs();
      setQueuedCount(newCount);

      let lookupResult: { title?: string; lookupStatus: 'found' | 'not_found' | 'failed' } = {
        lookupStatus: 'not_found',
      };
      try {
        recordScannerLog('title lookup started', { upc });
        const metadata = await lookupDvdByUpc(upc);
        if (metadata) {
          await saveUpcMetadata(upc, metadata);
          lookupResult = { title: metadata.title, lookupStatus: 'found' };
          recordScannerLog('title lookup found', {
            upc,
            title: metadata.title,
            source: metadata.source,
          });
        } else {
          await markUpcLookupNotFound(upc);
          recordScannerLog('title lookup not found', { upc });
        }
      } catch (lookupError: any) {
        const message = String(lookupError?.message || lookupError);
        lookupResult = { lookupStatus: 'failed' };
        await markUpcLookupFailed(upc, message);
        recordScannerLog('title lookup failed', { upc, error: message });
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showSavedToast(upc, lookupResult);
    } catch (e: any) {
      scanLockRef.current = false;
      recordScannerLog('save failed', { upc, error: String(e?.message || e) });
      setStatus({ kind: 'error', message: String(e?.message || e) });
    }
  }

  async function handleScannedValue(rawValue: string, source: string) {
    const upc = normalizeUpc(rawValue);
    recordScannerLog('normalized barcode value', { source, rawValue, upc });

    if (!upc) {
      recordScannerLog('ignored empty barcode value', { source, rawValue });
      return;
    }

    if (!isValidDvdUpc(upc)) {
      recordScannerLog('ignored invalid barcode value', { source, rawValue, upc });
      return;
    }

    await saveScannedUpc(upc);
  }

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    const raw = String(result.data || '').trim();
    const type = result.type || 'unknown';
    recordScannerLog('native barcode callback', {
      type,
      data: raw,
      raw: result.raw,
      scanLocked: scanLockRef.current,
      status: status.kind,
    });

    await handleScannedValue(raw, `camera:${type}`);
  }

  function resetScanner() {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    lastUpcRef.current = null;
    scanLockRef.current = false;
    recordScannerLog('scanner reset');
    setStatus({ kind: 'scanning' });
  }

  function openManual() {
    setManualUpc('');
    setManualOpen(true);
  }

  async function submitManual() {
    const upc = normalizeUpc(manualUpc);
    recordScannerLog('manual submit', { rawValue: manualUpc, upc });
    if (!isValidDvdUpc(upc)) {
      setStatus({ kind: 'error', message: 'Enter a valid UPC or EAN barcode.' });
      return;
    }

    setManualOpen(false);
    await saveScannedUpc(upc);
  }

  const permissionGranted = permission?.granted;

  return (
    <View style={styles.container}>
      {!permissionGranted ? (
        <View style={styles.card}>
          <Text style={styles.h1}>Scan UPC</Text>
          <Text style={styles.p}>
            Camera access is used only to scan DVD UPC barcodes and add those titles to your personal library. Manual entry is available if scanning is unavailable.
          </Text>
          <Pressable onPress={requestPermission} style={styles.primaryBtn}>
            <Text style={styles.primaryText}>Enable Camera</Text>
          </Pressable>
          <Pressable onPress={openManual} style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>Enter UPC Manually</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.cameraWrap}>
          <CameraView
            active={permissionGranted}
            style={StyleSheet.absoluteFill}
            facing="back"
            autofocus="on"
            barcodeScannerSettings={{ barcodeTypes: DVD_BARCODE_TYPES }}
            onCameraReady={() => recordScannerLog('camera ready', { barcodeTypes: DVD_BARCODE_TYPES })}
            onMountError={(event) => recordScannerLog('camera mount error', { message: event.message })}
            onBarcodeScanned={handleBarcodeScanned}
          />

          <View style={styles.overlay}>
            <View style={styles.topBar}>
              <Text style={styles.title}>Scan DVDs · Saved: {queuedCount}</Text>
              <View style={styles.topBarButtons}>
                <Pressable onPress={openManual} style={styles.smallBtn} hitSlop={8}>
                  <Text style={styles.smallBtnText}>Manual</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    router.replace('/(tabs)/library');
                  }}
                  style={styles.smallBtn}
                  hitSlop={8}
                >
                  <Text style={styles.smallBtnText}>Done</Text>
                </Pressable>
                <Pressable onPress={resetScanner} style={styles.smallBtn} hitSlop={8}>
                  <Text style={styles.smallBtnText}>Reset</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.scanArea}>
              <View style={styles.frame} />

              <View style={styles.toastArea}>
                {status.kind === 'saved' ? (
                  <View style={styles.toast}>
                    <Text style={styles.toastText}>
                      {status.lookupStatus === 'found' ? 'Title saved' : 'UPC saved'}
                    </Text>
                    {status.title ? <Text style={styles.toastTitleText}>{status.title}</Text> : null}
                    <Text style={styles.toastSubText}>{status.upc}</Text>
                    {status.lookupStatus !== 'found' ? (
                      <Text style={styles.toastHintText}>
                        {status.lookupStatus === 'failed' ? 'Lookup failed' : 'No title match yet'}
                      </Text>
                    ) : null}
                    <Pressable
                      onPress={() => {
                        router.replace('/(tabs)/library');
                      }}
                      style={styles.toastAction}
                    >
                      <Text style={styles.toastActionText}>Library</Text>
                    </Pressable>
                  </View>
                ) : null}
                {status.kind === 'saving' ? (
                  <View style={styles.toastMuted}>
                    <Text style={styles.toastText}>Saving...</Text>
                  </View>
                ) : null}
                {status.kind === 'error' ? (
                  <View style={styles.toastError}>
                    <Text style={styles.toastText}>{status.message}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      )}

      <Modal visible={manualOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          style={styles.sheetKeyboard}
        >
          <View style={styles.sheetBackdrop}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Manual UPC</Text>
              <TextInput
                value={manualUpc}
                onChangeText={(value) => setManualUpc(normalizeUpc(value))}
                keyboardType="number-pad"
                autoCorrect={false}
                placeholder="UPC or EAN"
                placeholderTextColor="#7f7f91"
                style={styles.input}
              />
              <View style={styles.sheetActions}>
                <Pressable onPress={() => setManualOpen(false)} style={styles.sheetSecondaryBtn}>
                  <Text style={styles.secondaryText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={submitManual} style={styles.sheetPrimaryBtn}>
                  <Text style={styles.primaryText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
  },
  card: {
    padding: 18,
    paddingTop: 64,
  },
  h1: {
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
  },
  p: {
    color: '#c9c9d1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  primaryBtn: {
    backgroundColor: '#5f162d',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryText: {
    color: 'white',
    fontWeight: '800',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#2d2d3e',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#12121a',
  },
  secondaryText: {
    color: 'white',
    fontWeight: '800',
  },
  cameraWrap: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 14,
    paddingBottom: 18,
    gap: 18,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  smallBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  smallBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  frame: {
    alignSelf: 'center',
    width: '86%',
    height: 160,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    gap: 28,
  },
  toastArea: {
    alignItems: 'center',
    gap: 8,
  },
  toast: {
    backgroundColor: 'rgba(24, 180, 90, 0.85)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 6,
  },
  toastMuted: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toastError: {
    backgroundColor: 'rgba(220, 60, 60, 0.85)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toastText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
  toastSubText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
  toastTitleText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    maxWidth: 260,
    textAlign: 'center',
  },
  toastHintText: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 260,
    textAlign: 'center',
  },
  toastAction: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  toastActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
  },
  sheetKeyboard: {
    flex: 1,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0b0b0f',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 10,
  },
  sheetTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderColor: '#2d2d3e',
    borderRadius: 12,
    padding: 12,
    color: 'white',
    backgroundColor: '#12121a',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
  },
  sheetPrimaryBtn: {
    flex: 1,
    backgroundColor: '#5f162d',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  sheetSecondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2d2d3e',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#12121a',
  },
});
