import { useEffect, useState, useCallback } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const loadAuth = useAuthStore(state => state.loadAuth);
  const [appIsReady, setAppIsReady] = useState(false);
  const { ref: referralCode } = useLocalSearchParams<{ ref?: string }>();

  // Capture referral code from URL and store it
  useEffect(() => {
    if (referralCode) {
      console.log('Referral code captured from URL:', referralCode);
      AsyncStorage.setItem('pending_referral_code', referralCode);
    }
  }, [referralCode]);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts
        await Font.loadAsync({
          ...Ionicons.font,
        });
        // Load auth
        await loadAuth();
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}