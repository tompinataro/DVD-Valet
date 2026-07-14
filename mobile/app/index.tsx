import { Link } from 'expo-router';
import { BackHandler, Image, Pressable, StyleSheet, Text, View } from 'react-native';

const DVD_VALET_LOGO = require('../assets/icon.png');

export default function IndexScreen() {
  return (
    <View style={styles.container}>
      <Image source={DVD_VALET_LOGO} style={styles.logo} resizeMode="contain" />
      <Text style={styles.h1}>{'Hi Mike,\nWelcome to\nyour custom\nDVD Library.'}</Text>

      <View style={styles.card}>
        <View style={styles.actionRow}>
          <Link href="/(tabs)/scan" asChild>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Scan DVDs</Text>
            </Pressable>
          </Link>

          <Link href="/(tabs)/library" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Open Library</Text>
            </Pressable>
          </Link>

          <Pressable onPress={() => BackHandler.exitApp()} style={styles.exitButton}>
            <Text style={styles.exitButtonText}>Exit</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
    paddingHorizontal: 20,
    paddingTop: 82,
  },
  logo: {
    alignSelf: 'center',
    width: 132,
    height: 132,
    marginBottom: 58,
  },
  h1: {
    color: 'white',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 38,
    textAlign: 'center',
  },
  card: {
    borderWidth: 1,
    borderColor: '#242431',
    borderRadius: 18,
    padding: 18,
    backgroundColor: '#12121a',
  },
  actionRow: {
    alignItems: 'center',
    gap: 20,
  },
  primaryButton: {
    alignSelf: 'center',
    backgroundColor: '#9f3654',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    minWidth: 150,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryButton: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#8b2b45',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    minWidth: 150,
    alignItems: 'center',
    backgroundColor: '#762038',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  exitButton: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#78223c',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    minWidth: 150,
    backgroundColor: '#5f162d',
  },
  exitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
});
