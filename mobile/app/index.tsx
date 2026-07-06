import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { saveFirstName } from '../src/db';

const DVD_VALET_LOGO = require('../assets/icon.png');

export default function IndexScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleNext() {
    setSubmitting(true);
    setError(null);
    try {
      await saveFirstName(firstName);
      router.replace('/welcome');
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Image source={DVD_VALET_LOGO} style={styles.logo} resizeMode="contain" />
      <View style={styles.card}>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          style={styles.input}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
          placeholder="Add your first name here..."
          placeholderTextColor="#707084"
          onSubmitEditing={handleNext}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable
          onPress={handleNext}
          style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>{submitting ? 'Saving...' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
    paddingHorizontal: 20,
    paddingTop: 56,
    justifyContent: 'center',
  },
  logo: {
    alignSelf: 'center',
    position: 'absolute',
    top: 84,
    width: 172,
    height: 172,
  },
  card: {
    borderWidth: 1,
    borderColor: '#242431',
    borderRadius: 18,
    padding: 18,
    backgroundColor: '#12121a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#2d2d3e',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    color: 'white',
    backgroundColor: '#171722',
    fontSize: 16,
    marginBottom: 12,
  },
  errorText: {
    color: '#ff9a9a',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  primaryButton: {
    alignSelf: 'center',
    backgroundColor: '#5f162d',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    width: '65%',
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
});
