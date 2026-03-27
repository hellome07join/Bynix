import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Declare window for TypeScript
declare const window: any;

// CRITICAL: Capture referral code BEFORE any redirect happens
// This runs synchronously when the module loads on web
const captureReferralCodeFromURL = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref') || urlParams.get('lid');
      if (refCode) {
        console.log('[Index] Captured referral code from URL on load:', refCode);
        // Store immediately - this happens before React even mounts
        AsyncStorage.setItem('pending_referral_code', refCode);
        return refCode;
      }
    } catch (e) {
      console.warn('[Index] Error capturing referral code:', e);
    }
  }
  return null;
};

// Execute immediately when module loads
const capturedRefCode = captureReferralCodeFromURL();

export default function Index() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const hasRedirected = useRef(false);

  // Double-check and save referral code when component mounts
  useEffect(() => {
    const saveReferralCode = async () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const refCode = urlParams.get('ref') || urlParams.get('lid');
          if (refCode) {
            console.log('[Index] useEffect - Saving referral code:', refCode);
            await AsyncStorage.setItem('pending_referral_code', refCode);
          }
        } catch (e) {
          console.warn('[Index] Error in useEffect referral capture:', e);
        }
      }
    };
    saveReferralCode();
  }, []);

  useEffect(() => {
    if (!isLoading && !hasRedirected.current) {
      hasRedirected.current = true;
      if (user) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/welcome');
      }
    }
  }, [user, isLoading]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>BYNIX</Text>
        <Text style={styles.tagline}>Trade Smarter, Win Bigger</Text>
        <ActivityIndicator size="large" color="#00E55A" style={styles.loader} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1A0F',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00E55A',
    letterSpacing: 4,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.7,
    marginBottom: 40,
  },
  loader: {
    marginTop: 20,
  },
});