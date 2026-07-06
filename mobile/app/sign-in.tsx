import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '../src/auth';

export default function SignInScreen() {
  const router = useRouter();
  const { ready, session, signIn, signOut, startupError } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email);
      router.replace('/(tabs)/scan');
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.appTitle}>DVD Valet</Text>
      <Text style={styles.h1}>Optional local profile</Text>
      <Text style={styles.p}>
        DVD Valet works immediately without an account. If you want, save an email address locally on this device so your collection profile is easier to recognize later.
      </Text>
      {!ready ? <Text style={styles.notice}>Preparing local library in the background...</Text> : null}
      {startupError ? <Text style={styles.error}>{startupError}</Text> : null}

      {session ? (
        <View style={styles.card}>
          <Text style={styles.label}>Saved profile</Text>
          <Text style={styles.profileValue}>{session.email}</Text>
          <Text style={styles.small}>
            This profile is stored only on this device. Your library remains available even if you clear it.
          </Text>

          <Pressable
            onPress={() => {
              router.replace('/(tabs)/library');
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Back to library</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              void signOut();
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Clear saved profile</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="name@example.com"
            placeholderTextColor="#707084"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={handleSignIn}
            style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
            disabled={submitting}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? 'Saving profile...' : 'Save local profile'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              router.replace('/(tabs)/scan');
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Skip and scan DVDs now</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.small}>No invitation, account approval, or organization membership is required to use DVD Valet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 72,
    backgroundColor: '#0b0b0f',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    color: '#f7e7b1',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 28,
    textAlign: 'center',
  },
  h1: {
    color: 'white',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 12,
  },
  p: {
    color: '#c9c9d1',
    fontSize: 15,
    marginBottom: 22,
    lineHeight: 22,
  },
  card: {
    borderWidth: 1,
    borderColor: '#242431',
    borderRadius: 18,
    padding: 16,
    backgroundColor: '#12121a',
    marginBottom: 18,
  },
  label: {
    color: '#9a9ab0',
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#2d2d3e',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: 'white',
    backgroundColor: '#171722',
  },
  error: {
    color: '#ff8f8f',
    fontSize: 13,
    marginBottom: 12,
  },
  notice: {
    color: '#f7e7b1',
    fontSize: 13,
    marginBottom: 14,
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: '#5f162d',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2d2d3e',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#171722',
  },
  secondaryButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  profileValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  small: {
    color: '#9a9ab0',
    fontSize: 12,
    lineHeight: 18,
  },
});
