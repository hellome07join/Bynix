import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { API_URL } from '../../utils/api';

const { width, height } = Dimensions.get('window');

export default function Welcome() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleStartDemo = async () => {
    setIsLoading(true);
    try {
      // Create a demo account with random email
      const timestamp = Date.now();
      const demoEmail = `demo_${timestamp}@bynix.com`;
      const demoPassword = `demo_${timestamp}`;
      
      // Signup
      const signupResponse = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: demoEmail,
          password: demoPassword,
          name: 'Demo User'
        })
      });
      
      if (!signupResponse.ok) {
        throw new Error('Failed to create demo account');
      }
      
      const signupData = await signupResponse.json();
      const otp = signupData.otp; // Get OTP from signup response
      
      // Verify OTP using the actual OTP from signup
      const verifyResponse = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: demoEmail,
          otp: otp
        })
      });
      
      if (!verifyResponse.ok) {
        throw new Error('Failed to verify demo account');
      }
      
      const data = await verifyResponse.json();
      
      // Get user details
      const meResponse = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
      });
      
      const userData = await meResponse.json();
      
      // Login user
      await login(data.access_token, {
        user_id: userData.user_id,
        email: userData.email,
        name: userData.name || 'Demo User',
        demo_balance: userData.demo_balance || 10000,
        real_balance: userData.real_balance || 0,
        bonus_balance: userData.bonus_balance || 0,
        is_admin: false,
      });
      
      // Navigate to trade screen
      router.replace('/(tabs)/trade');
    } catch (error) {
      console.error('Demo account error:', error);
      Alert.alert('Error', 'Failed to create demo account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>BYNIX</Text>
        <Text style={styles.subtitle}>Smart Binary Options Trading</Text>
      </View>

      <View style={styles.features}>
        <View style={styles.featureItem}>
          <Ionicons name="trending-up" size={32} color="#00D7A3" />
          <Text style={styles.featureText}>Real-time Trading</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="wallet" size={32} color="#00D7A3" />
          <Text style={styles.featureText}>Secure Wallet</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="analytics" size={32} color="#00D7A3" />
          <Text style={styles.featureText}>Advanced Analytics</Text>
        </View>
      </View>

      {/* Demo Account Button */}
      <TouchableOpacity 
        style={styles.demoButton}
        onPress={handleStartDemo}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#0A0E27" />
        ) : (
          <>
            <Ionicons name="gift" size={20} color="#0A0E27" />
            <Text style={styles.demoButtonText}>Get $10,000 Demo Account</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.secondaryButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#00D7A3',
    letterSpacing: 6,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  features: {
    marginVertical: 30,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 16,
    fontWeight: '600',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFB800',
    paddingVertical: 16,
    borderRadius: 12,
    marginVertical: 16,
    gap: 10,
  },
  demoButtonText: {
    color: '#0A0E27',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: 'auto',
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#00D7A3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#0A0E27',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00D7A3',
  },
  secondaryButtonText: {
    color: '#00D7A3',
    fontSize: 16,
    fontWeight: 'bold',
  },
});