import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../utils/api';

// Declare window for TypeScript
declare const window: any;

// Track affiliate link click
const trackAffiliateClick = async (refCode: string) => {
  try {
    const response = await fetch(`${API_URL}/affiliates/track-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: refCode })
    });
    const data = await response.json();
    console.log('[Index] Click tracked:', data);
  } catch (e) {
    console.warn('[Index] Error tracking click:', e);
  }
};

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
        // Track the click asynchronously
        trackAffiliateClick(refCode);
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
        // CRITICAL: Pass referral code in URL to welcome page so it persists
        let refCodeToPass = capturedRefCode;
        
        // Try to get from URL again if not already captured
        if (!refCodeToPass && Platform.OS === 'web' && typeof window !== 'undefined') {
          try {
            const urlParams = new URLSearchParams(window.location.search);
            refCodeToPass = urlParams.get('ref') || urlParams.get('lid') || null;
          } catch (e) {}
        }
        
        if (refCodeToPass) {
          console.log('[Index] Redirecting to welcome WITH referral code:', refCodeToPass);
          router.replace(`/(auth)/welcome?ref=${refCodeToPass}`);
        } else {
          router.replace('/(auth)/welcome');
        }
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