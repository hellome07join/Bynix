import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function ServiceAgreement() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0E17', '#0D1321', '#0A0E17']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Image 
            source={{ uri: 'https://customer-assets.emergentagent.com/job_bynix-markets/artifacts/fhiw6o6y_IMG_3122.png' }}
            style={styles.headerLogoImage}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>Bynix</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Service Agreement</Text>
        <Text style={styles.lastUpdated}>Last Updated: January 2024</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By accessing or using Bynix Trading Ltd.'s services, you agree to be bound by this Service Agreement. If you do not agree to these terms, please do not use our services.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Eligibility</Text>
          <Text style={styles.paragraph}>
            To use our services, you must:
          </Text>
          <Text style={styles.listItem}>• Be at least 18 years of age</Text>
          <Text style={styles.listItem}>• Have the legal capacity to enter into binding contracts</Text>
          <Text style={styles.listItem}>• Not be a resident of a restricted jurisdiction</Text>
          <Text style={styles.listItem}>• Complete our KYC verification process</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Account Registration</Text>
          <Text style={styles.paragraph}>
            You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate. You are responsible for maintaining the confidentiality of your account credentials.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Services Provided</Text>
          <Text style={styles.paragraph}>
            Bynix provides access to:
          </Text>
          <Text style={styles.listItem}>• Online trading platform for forex, cryptocurrencies, stocks, indices, and commodities</Text>
          <Text style={styles.listItem}>• Real-time market data and charts</Text>
          <Text style={styles.listItem}>• Account management tools</Text>
          <Text style={styles.listItem}>• Customer support services</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. User Responsibilities</Text>
          <Text style={styles.paragraph}>
            You agree to:
          </Text>
          <Text style={styles.listItem}>• Use the services only for lawful purposes</Text>
          <Text style={styles.listItem}>• Not engage in market manipulation or fraudulent activities</Text>
          <Text style={styles.listItem}>• Not use automated systems without prior authorization</Text>
          <Text style={styles.listItem}>• Comply with all applicable laws and regulations</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Intellectual Property</Text>
          <Text style={styles.paragraph}>
            All content, trademarks, and intellectual property on our platform are owned by Bynix Trading Ltd. You may not copy, modify, or distribute any content without our express written permission.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            Bynix shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our services, including but not limited to trading losses.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Termination</Text>
          <Text style={styles.paragraph}>
            We reserve the right to suspend or terminate your account at any time for violation of these terms or for any other reason at our sole discretion.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Governing Law</Text>
          <Text style={styles.paragraph}>
            This Agreement shall be governed by and construed in accordance with the laws of the United Kingdom.
          </Text>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 55 : 35,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1F2E',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1F2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoImage: {
    width: 32,
    height: 32,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#00E55A',
    marginTop: 25,
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 13,
    color: '#888',
    marginBottom: 25,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: '#AAA',
    lineHeight: 22,
    marginBottom: 10,
  },
  listItem: {
    fontSize: 14,
    color: '#AAA',
    lineHeight: 24,
    marginLeft: 10,
  },
  bottomSpacing: {
    height: 50,
  },
});
