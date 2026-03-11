import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

export default function HomeScreen() {
  const [status, setStatus] = useState<'signed_out' | 'signed_in'>('signed_out');
  const headline = useMemo(
    () => (status === 'signed_in' ? 'Your Library' : 'Welcome to DVD Valet'),
    [status]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>{headline}</Text>
      <Text style={styles.p}>
        MVP plan: Sign in → Scan UPC → Queue offline lookups → Sync to Supabase.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Temporary status toggle (dev)</Text>
        <TextInput
          value={status}
          onChangeText={(t) => setStatus(t === 'signed_in' ? 'signed_in' : 'signed_out')}
          style={styles.input}
          autoCapitalize="none"
        />
      </View>

      <Text style={styles.small}>
        Next: auth screens, camera scan, local queue (SQLite), and Supabase sync.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 64,
    backgroundColor: '#0b0b0f',
  },
  h1: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  p: {
    color: '#c9c9d1',
    fontSize: 15,
    marginBottom: 18,
    lineHeight: 22,
  },
  card: {
    borderWidth: 1,
    borderColor: '#242431',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#12121a',
    marginBottom: 18,
  },
  label: {
    color: '#9a9ab0',
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#2d2d3e',
    borderRadius: 10,
    padding: 10,
    color: 'white',
  },
  small: {
    color: '#9a9ab0',
    fontSize: 12,
  },
});
