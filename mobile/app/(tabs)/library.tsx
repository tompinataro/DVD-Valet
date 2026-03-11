import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { useQueuedUpcs } from '../../src/hooks/useQueuedUpcs';

export default function LibraryScreen() {
  const { items, loading, error, refresh } = useQueuedUpcs();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.h1}>Queued UPCs</Text>
        <Pressable onPress={refresh} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      {loading ? <Text style={styles.p}>Loading…</Text> : null}
      {error ? <Text style={[styles.p, styles.error]}>Error: {String(error.message || error)}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(it) => it.upc}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.upc}>{item.upc}</Text>
            <Text style={styles.meta}>last scanned: {item.last_scanned_at.slice(0, 19).replace('T', ' ')}</Text>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.p}>No scans yet.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
    padding: 16,
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
    marginBottom: 10,
  },
  error: {
    color: '#ff6b6b',
  },
  refreshBtn: {
    borderWidth: 1,
    borderColor: '#2d2d3e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  refreshText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  row: {
    borderWidth: 1,
    borderColor: '#242431',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#12121a',
  },
  upc: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  meta: {
    color: '#9a9ab0',
    fontSize: 12,
  },
});
