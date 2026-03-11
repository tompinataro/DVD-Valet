import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { countQueuedUpcs, ensureSchema, upsertUpc } from '../../src/db';

type ScanStatus =
  | { kind: 'idle' }
  | { kind: 'scanning' }
  | { kind: 'saving'; upc: string }
  | { kind: 'saved'; upc: string }
  | { kind: 'error'; message: string };

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<ScanStatus>({ kind: 'idle' });
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const lastUpcRef = useRef<string | null>(null);
  const toastTimerRef = useRef<any>(null);

  useEffect(() => {
    ensureSchema()
      .then(() => countQueuedUpcs())
      .then(setQueuedCount)
      .catch(() => {
        // ignore; will surface on save
      });
  }, []);

  const canScan = useMemo(() => {
    return status.kind === 'scanning' || status.kind === 'idle' || status.kind === 'saved';
  }, [status.kind]);

  function showSavedToast(upc: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setStatus({ kind: 'saved', upc });
    toastTimerRef.current = setTimeout(() => {
      setStatus({ kind: 'scanning' });
    }, 900);
  }

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (!canScan) return;

    const raw = String(result.data || '').trim();
    if (!raw) return;

    // Dedup within batch: ignore immediate repeats + ignore already-seen UPCs.
    if (lastUpcRef.current === raw) return;
    lastUpcRef.current = raw;

    try {
      setStatus({ kind: 'saving', upc: raw });
      await upsertUpc(raw);
      const newCount = await countQueuedUpcs();
      setQueuedCount(newCount);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showSavedToast(raw);
    } catch (e: any) {
      setStatus({ kind: 'error', message: String(e?.message || e) });
    }
  }

  const permissionGranted = permission?.granted;

  return (
    <View style={styles.container}>
      {!permissionGranted ? (
        <View style={styles.card}>
          <Text style={styles.h1}>Scan UPC</Text>
          <Text style={styles.p}>
            Camera access is required to scan UPC codes. We only request permission when you choose to scan.
          </Text>
          <Pressable onPress={requestPermission} style={styles.primaryBtn}>
            <Text style={styles.primaryText}>Enable Camera</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['upc_a', 'ean13'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />

          <View style={styles.overlay}>
            <View style={styles.topBar}>
              <Text style={styles.title}>Batch Scan · Queued: {queuedCount}</Text>
              <View style={styles.topBarButtons}>
                <Pressable
                  onPress={() => {
                    router.replace('/(tabs)/library');
                  }}
                  style={styles.smallBtn}
                >
                  <Text style={styles.smallBtnText}>Done</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    lastUpcRef.current = null;
                    setStatus({ kind: 'scanning' });
                  }}
                  style={styles.smallBtn}
                >
                  <Text style={styles.smallBtnText}>Reset</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.frame} />

            <View style={styles.toastArea}>
              {status.kind === 'saved' ? (
                <View style={styles.toast}>
                  <Text style={styles.toastText}>Saved: {status.upc}</Text>
                </View>
              ) : null}
              {status.kind === 'saving' ? (
                <View style={styles.toastMuted}>
                  <Text style={styles.toastText}>Saving…</Text>
                </View>
              ) : null}
              {status.kind === 'error' ? (
                <View style={styles.toastError}>
                  <Text style={styles.toastText}>Error: {status.message}</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.help}>Aim the UPC inside the box. Duplicates are ignored.</Text>
          </View>
        </View>
      )}
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
  },
  primaryText: {
    color: 'white',
    fontWeight: '800',
  },
  cameraWrap: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 14,
    justifyContent: 'space-between',
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
    fontSize: 16,
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
  toastArea: {
    alignItems: 'center',
    gap: 8,
  },
  toast: {
    backgroundColor: 'rgba(24, 180, 90, 0.85)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  help: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    paddingBottom: 18,
    fontSize: 12,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
