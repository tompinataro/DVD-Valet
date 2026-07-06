import { Stack } from 'expo-router';

import { AuthProvider } from '../src/auth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}
