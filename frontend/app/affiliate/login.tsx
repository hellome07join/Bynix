import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../utils/api';

const BYNIX_LOGO_URL = 'https://customer-assets.emergentagent.com/job_bynix-markets/artifacts/lgz5jvli_IMG_3255.png';

export default function AffiliateLoginPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [telegram, setTelegram] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (!isLogin && !name) {
      setError('Please enter your name');
      return;
    }
    
    setLoading(true);
    
    try {
      const endpoint = isLogin ? '/affiliate/login' : '/affiliate/register';
      const body = isLogin 
        ? { email, password }
        : { email, password, name, telegram };
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const text = await response.text();
      console.log('API Response:', text);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Invalid response: ${text.substring(0, 100)}`);
      }
      
      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }
      
      // Save token
      await AsyncStorage.setItem('affiliate_token', data.token);
      await AsyncStorage.setItem('affiliate_data', JSON.stringify(data.affiliate));
      
      // Navigate to dashboard
      router.replace('/affiliate/dashboard');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={{ uri: BYNIX_LOGO_URL }} style={styles.logo} resizeMode="contain" />
        </View>
        
        {/* Title */}
        <Text style={styles.title}>{isLogin ? 'Partner Login' : 'Become a Partner'}</Text>
        <Text style={styles.subtitle}>
          {isLogin ? 'Access your affiliate dashboard' : 'Start earning up to 85% commission'}
        </Text>
        
        {/* Error Message */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        
        {/* Form */}
        <View style={styles.form}>
          {!isLogin && (
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#8898AA" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#8898AA"
                value={name}
                onChangeText={setName}
              />
            </View>
          )}
          
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#8898AA" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#8898AA"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#8898AA" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#8898AA"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#8898AA" />
            </TouchableOpacity>
          </View>
          
          {!isLogin && (
            <View style={styles.inputWrapper}>
              <Ionicons name="logo-telegram" size={20} color="#8898AA" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Telegram Username (optional)"
                placeholderTextColor="#8898AA"
                value={telegram}
                onChangeText={setTelegram}
              />
            </View>
          )}
          
          {/* Submit Button */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            <LinearGradient colors={['#00E55A', '#00C94D']} style={styles.submitBtnGradient}>
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
                  <Ionicons name="arrow-forward" size={20} color="#000" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Toggle Login/Register */}
          <TouchableOpacity style={styles.toggleBtn} onPress={() => { setIsLogin(!isLogin); setError(''); }}>
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account? " : "Already a partner? "}
              <Text style={styles.toggleLink}>{isLogin ? 'Register' : 'Sign In'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Features */}
        {!isLogin && (
          <View style={styles.features}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#00E55A" />
              <Text style={styles.featureText}>Up to 85% Revenue Share</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#00E55A" />
              <Text style={styles.featureText}>Weekly Payouts</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#00E55A" />
              <Text style={styles.featureText}>Real-time Tracking</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  scrollContent: {
    padding: 20,
    minHeight: '100%',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 180,
    height: 90,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#8898AA',
    textAlign: 'center',
    marginBottom: 30,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
  },
  form: {
    marginBottom: 30,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: '#FFF',
  },
  submitBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  toggleBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    color: '#8898AA',
  },
  toggleLink: {
    color: '#00E55A',
    fontWeight: '600',
  },
  features: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: '#FFF',
    marginLeft: 12,
    fontSize: 14,
  },
});
