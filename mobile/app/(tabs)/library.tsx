import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useFocusEffect } from 'expo-router';

import { deleteQueuedUpc, type QueuedUpc } from '../../src/db';
import { useQueuedUpcs } from '../../src/hooks/useQueuedUpcs';

const SAMPLE_DVDS = [
  { id: 'sample-1', title: 'The Grand Adventure', format: 'DVD', note: 'Example title preview' },
  { id: 'sample-2', title: 'Classic Cinema Collection', format: 'Box Set', note: 'Example library card' },
  { id: 'sample-3', title: 'Family Movie Night', format: 'Blu-ray', note: 'Appears here after scanning' },
];

const CSV_HEADERS = [
  'title',
  'upc',
  'format',
  'brand',
  'lookup_status',
  'lookup_source',
  'last_scanned_at',
  'first_scanned_at',
];

function toCsvCell(value: string | null | undefined) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function buildLibraryCsv(items: QueuedUpc[]) {
  const rows = items.map((item) => [
    item.title || '',
    item.upc,
    item.format || '',
    item.brand || '',
    item.lookup_status,
    item.lookup_source || '',
    item.last_scanned_at,
    item.first_scanned_at,
  ]);

  return [
    CSV_HEADERS.map(toCsvCell).join(','),
    ...rows.map((row) => row.map(toCsvCell).join(',')),
  ].join('\n');
}

export default function LibraryScreen() {
  const { items, loading, error, refresh } = useQueuedUpcs();
  const [showIntro, setShowIntro] = useState(true);

  const shouldShowEmptyState = useMemo(() => !loading && items.length === 0, [items.length, loading]);

  function confirmDelete(item: QueuedUpc) {
    const name = item.title || `UPC ${item.upc}`;
    Alert.alert(
      'Delete DVD?',
      `Remove ${name} from Mike's DVD Library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteQueuedUpc(item.upc).then(refresh);
          },
        },
      ],
      { cancelable: true }
    );
  }

  async function exportCsv() {
    if (!items.length) {
      Alert.alert('Nothing to export', 'Scan DVDs first, then export Mike\'s library as CSV.');
      return;
    }

    const csv = buildLibraryCsv(items);
    await Share.share({
      title: 'DVD Valet Library CSV',
      message: csv,
    });
  }

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  return (
    <View style={styles.container}>
      <Modal
        transparent
        animationType="fade"
        visible={showIntro && shouldShowEmptyState}
        onRequestClose={() => setShowIntro(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>DVD Valet Tip</Text>
            <Text style={styles.modalTitle}>Your DVD library contents will appear here</Text>
            <Text style={styles.modalCopy}>
              Add them with one tap from your camera on the Scan tab. No account or invitation is required to start building your collection.
            </Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowIntro(false)} style={styles.modalSecondaryButton}>
                <Text style={styles.modalSecondaryButtonText}>Got it</Text>
              </Pressable>
              <Link href="/(tabs)/scan" asChild>
                <Pressable style={styles.modalPrimaryButton}>
                  <Text style={styles.modalPrimaryButtonText}>Open scanner</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.headerRow}>
        <Text style={styles.h1}>DVD Library</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={exportCsv} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Export CSV</Text>
          </Pressable>
          <Pressable onPress={refresh} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Refresh</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.p}>
        Saved DVDs appear here after they are scanned. If title lookup is unavailable, DVD Valet keeps the UPC so it can be matched later.
      </Text>
      {loading ? <Text style={styles.status}>Checking your local library…</Text> : null}
      {error ? <Text style={[styles.status, styles.error]}>{error}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(it) => it.upc}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          return (
            <LibraryRow
              item={item}
              onDelete={() => confirmDelete(item)}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Your library is empty</Text>
            <Text style={styles.emptyCopy}>
              Add your first DVD to start building your collection. You can open the scanner now, even if the device is offline and before saving any profile.
            </Text>
            <Link href="/(tabs)/scan" asChild>
              <Pressable style={styles.primaryCta}>
                <Text style={styles.primaryCtaText}>Add your first DVD</Text>
              </Pressable>
            </Link>

            <View style={styles.sampleSection}>
              <Text style={styles.sampleHeading}>Sample library preview</Text>
              {SAMPLE_DVDS.map((sample) => (
                <View key={sample.id} style={styles.sampleCard}>
                  <View style={styles.sampleBadge}>
                    <Text style={styles.sampleBadgeText}>Example</Text>
                  </View>
                  <Text style={styles.sampleTitle}>{sample.title}</Text>
                  <Text style={styles.sampleMeta}>
                    {sample.format} · {sample.note}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        }
      />
    </View>
  );
}

function LibraryRow({ item, onDelete }: { item: QueuedUpc; onDelete: () => void }) {
  const translateX = useMemo(() => new Animated.Value(0), []);
  const hasTitle = Boolean(item.title);
  const lookupLabel =
    item.lookup_status === 'found'
      ? [item.format, item.brand || item.lookup_source].filter(Boolean).join(' · ')
      : item.lookup_status === 'failed'
        ? 'Title lookup failed. UPC is saved.'
        : item.lookup_status === 'not_found'
          ? 'No title match found yet.'
          : 'Title lookup pending.';

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          const nextValue = Math.max(-96, Math.min(0, gesture.dx));
          translateX.setValue(nextValue);
        },
        onPanResponderRelease: (_, gesture) => {
          Animated.spring(translateX, {
            toValue: gesture.dx < -56 ? -96 : 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [translateX]
  );

  function closeAndDelete() {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start(onDelete);
  }

  return (
    <View style={styles.swipeRow}>
      <Pressable onPress={closeAndDelete} style={styles.deleteRail}>
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.row,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <Text style={hasTitle ? styles.itemTitle : styles.upcOnlyTitle}>
          {item.title || 'UPC saved'}
        </Text>
        {item.subtitle ? (
          <Text style={styles.description} numberOfLines={2}>
            {item.subtitle}
          </Text>
        ) : null}
        <Text style={styles.upc}>UPC {item.upc}</Text>
        {lookupLabel ? <Text style={styles.lookupMeta}>{lookupLabel}</Text> : null}
        <Text style={styles.meta}>last scanned: {item.last_scanned_at.slice(0, 19).replace('T', ' ')}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
    padding: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.66)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    borderWidth: 1,
    borderColor: '#2d2d3e',
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#12121a',
  },
  modalEyebrow: {
    color: '#f7e7b1',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
  },
  modalCopy: {
    color: '#c9c9d1',
    fontSize: 14,
    lineHeight: 21,
  },
  modalActions: {
    gap: 10,
    marginTop: 18,
  },
  modalPrimaryButton: {
    backgroundColor: '#5f162d',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
  modalSecondaryButton: {
    borderWidth: 1,
    borderColor: '#2d2d3e',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#171722',
  },
  modalSecondaryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  h1: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  p: {
    color: '#c9c9d1',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 21,
  },
  status: {
    color: '#9a9ab0',
    fontSize: 13,
    marginBottom: 10,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    borderWidth: 1,
    borderColor: '#2d2d3e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  headerBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    gap: 10,
    paddingBottom: 24,
    flexGrow: 1,
  },
  swipeRow: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  deleteRail: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    backgroundColor: '#8f1d2f',
    justifyContent: 'center',
    paddingRight: 20,
  },
  deleteText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
  },
  row: {
    borderWidth: 1,
    borderColor: '#242431',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#12121a',
  },
  upc: {
    color: '#c9c9d1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  itemTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  upcOnlyTitle: {
    color: '#f7e7b1',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  description: {
    color: '#c9c9d1',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  lookupMeta: {
    color: '#f7e7b1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  meta: {
    color: '#9a9ab0',
    fontSize: 12,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: '#242431',
    borderRadius: 16,
    padding: 18,
    backgroundColor: '#12121a',
    marginTop: 4,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
  },
  emptyCopy: {
    color: '#c9c9d1',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  primaryCta: {
    backgroundColor: '#5f162d',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryCtaText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
  sampleSection: {
    marginTop: 18,
    gap: 10,
  },
  sampleHeading: {
    color: '#f7e7b1',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  sampleCard: {
    borderWidth: 1,
    borderColor: '#2d2d3e',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#171722',
  },
  sampleBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#2b2032',
    marginBottom: 8,
  },
  sampleBadgeText: {
    color: '#f7e7b1',
    fontSize: 11,
    fontWeight: '700',
  },
  sampleTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sampleMeta: {
    color: '#9a9ab0',
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    color: '#ff9a9a',
  },
});
