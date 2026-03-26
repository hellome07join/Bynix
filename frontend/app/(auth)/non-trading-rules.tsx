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

export default function NonTradingRules() {
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
        <Text style={styles.title}>Non-Trading Operations Regulations</Text>
        <Text style={styles.lastUpdated}>Last Updated: January 2024</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Account Management</Text>
          <Text style={styles.paragraph}>
            Account-related operations include:
          </Text>
          <Text style={styles.listItem}>• Account registration and verification</Text>
          <Text style={styles.listItem}>• Profile updates and settings changes</Text>
          <Text style={styles.listItem}>• Password and security settings</Text>
          <Text style={styles.listItem}>• Communication preferences</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Deposit Procedures</Text>
          <Text style={styles.paragraph}>
            Deposits can be made through various methods:
          </Text>
          <Text style={styles.listItem}>• Cryptocurrency (Bitcoin, USDT, Ethereum, etc.)</Text>
          <Text style={styles.listItem}>• Bank wire transfer</Text>
          <Text style={styles.listItem}>• Local payment methods (where available)</Text>
          <Text style={styles.paragraph}>
            Processing times vary by method. Cryptocurrency deposits are typically credited within 30 minutes after network confirmation.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Withdrawal Procedures</Text>
          <Text style={styles.paragraph}>
            Withdrawal requests are processed within 1-3 business days. Requirements include:
          </Text>
          <Text style={styles.listItem}>• Completed KYC verification</Text>
          <Text style={styles.listItem}>• Minimum withdrawal amount: $10</Text>
          <Text style={styles.listItem}>• Same method as deposit (where applicable)</Text>
          <Text style={styles.listItem}>• Valid withdrawal address/account details</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. KYC/AML Requirements</Text>
          <Text style={styles.paragraph}>
            Know Your Customer (KYC) verification requires:
          </Text>
          <Text style={styles.listItem}>• Valid government-issued photo ID</Text>
          <Text style={styles.listItem}>• Proof of address (utility bill or bank statement)</Text>
          <Text style={styles.listItem}>• Selfie verification</Text>
          <Text style={styles.paragraph}>
            Verification typically takes 24-48 hours after document submission.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Bonus Terms</Text>
          <Text style={styles.paragraph}>
            Promotional bonuses are subject to:
          </Text>
          <Text style={styles.listItem}>• Specific trading volume requirements</Text>
          <Text style={styles.listItem}>• Time limitations for meeting requirements</Text>
          <Text style={styles.listItem}>• Maximum withdrawal limits until requirements are met</Text>
          <Text style={styles.listItem}>• One bonus per person/household/IP address</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Account Dormancy</Text>
          <Text style={styles.paragraph}>
            Accounts with no activity for 12 months may be classified as dormant. Dormant accounts may be subject to:
          </Text>
          <Text style={styles.listItem}>• Monthly inactivity fees</Text>
          <Text style={styles.listItem}>• Account suspension</Text>
          <Text style={styles.listItem}>• Eventual account closure</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Communication Policy</Text>
          <Text style={styles.paragraph}>
            We communicate with clients through:
          </Text>
          <Text style={styles.listItem}>• Email notifications</Text>
          <Text style={styles.listItem}>• Platform notifications</Text>
          <Text style={styles.listItem}>• SMS alerts (if enabled)</Text>
          <Text style={styles.paragraph}>
            Clients are responsible for maintaining valid contact information and regularly checking communications.
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
