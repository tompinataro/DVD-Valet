import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../src/auth';

export default function TabsLayout() {
  const router = useRouter();
  const { ready, session, startupError } = useAuth();

  if (!ready) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.loadingTitle}>Opening DVD Valet</Text>
        <Text style={styles.loadingCopy}>
          Your library shell is on screen while we restore local data in the background.
        </Text>
        {startupError ? <Text style={styles.loadingError}>{startupError}</Text> : null}
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#0b0b0f' },
        headerTitle: 'DVD Valet',
        headerTitleAlign: 'center',
        headerTintColor: 'white',
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: '#12121a', borderTopColor: '#242431' },
        tabBarActiveTintColor: '#f7e7b1',
        tabBarInactiveTintColor: '#9a9ab0',
        headerRight: () => (
          <Pressable
            onPress={() => {
              router.push('/sign-in');
            }}
            style={styles.signOutButton}
          >
            <Text style={styles.signOutText}>{session ? 'Profile' : 'Optional Profile'}</Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="scan"
        options={{
          tabBarLabel: 'Scan',
          tabBarIcon: ({ color, size }) => <Ionicons name="scan" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          tabBarLabel: 'Library',
          tabBarIcon: ({ color, size }) => <Ionicons name="albums" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    backgroundColor: '#0b0b0f',
    paddingHorizontal: 20,
    paddingTop: 88,
  },
  loadingTitle: {
    color: 'white',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 12,
  },
  loadingCopy: {
    color: '#c9c9d1',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  loadingError: {
    color: '#ff9a9a',
    fontSize: 13,
    lineHeight: 19,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: '#2d2d3e',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  signOutText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
});
