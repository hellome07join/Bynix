import { useEffect, useState, useCallback } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Declare window for TypeScript
declare const window: any;

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// CRITICAL: Capture referral code IMMEDIATELY when this module loads (before React mounts)
// This ensures we grab the ?ref= param from the URL before any redirect wipes it
const captureReferralOnLoad = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref') || urlParams.get('lid');
      if (refCode) {
        console.log('[RootLayout] IMMEDIATELY captured referral code on module load:', refCode);
        AsyncStorage.setItem('pending_referral_code', refCode);
        return refCode;
      }
    } catch (e) {
      console.warn('[RootLayout] Error capturing referral on load:', e);
    }
  }
  return null;
};

// Execute immediately - this runs when the module is imported
const immediatelyCaptuedRefCode = captureReferralOnLoad();

export default function RootLayout() {
  const loadAuth = useAuthStore(state => state.loadAuth);
  const [appIsReady, setAppIsReady] = useState(false);
  const { ref: referralCode, lid: linkId } = useLocalSearchParams<{ ref?: string; lid?: string }>();

  // Capture referral code from URL and store it (backup from expo-router hook)
  useEffect(() => {
    const codeToSave = referralCode || linkId;
    if (codeToSave) {
      console.log('[RootLayout] Referral code captured from expo-router hook:', codeToSave);
      AsyncStorage.setItem('pending_referral_code', codeToSave);
    }
  }, [referralCode, linkId]);
  
  // Also try to capture from window.location as a fallback (for web)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref') || urlParams.get('lid');
        if (refCode) {
          console.log('[RootLayout] useEffect - Backup capture from window.location:', refCode);
          AsyncStorage.setItem('pending_referral_code', refCode);
        }
      } catch (e) {
        console.warn('[RootLayout] Error in backup capture:', e);
      }
    }
  }, []);

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