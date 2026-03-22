import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function Welcome() {
  const router = useRouter();

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

      <View style={styles.demoInfo}>
        <Text style={styles.demoText}>🎁 Get $10,000 demo account to start</Text>
      </View>

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
    marginTop: 80,
    marginBottom: 60,
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
    marginVertical: 40,
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
  demoInfo: {
    backgroundColor: 'rgba(0, 215, 163, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginVertical: 24,
    borderWidth: 1,
    borderColor: '#00D7A3',
  },
  demoText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
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