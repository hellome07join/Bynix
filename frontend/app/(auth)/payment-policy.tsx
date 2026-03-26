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

export default function PaymentPolicy() {
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
        <Text style={styles.title}>Payment Policy</Text>
        <Text style={styles.lastUpdated}>Last Updated: January 2024</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Accepted Payment Methods</Text>
          <Text style={styles.paragraph}>
            We accept the following payment methods:
          </Text>
          <View style={styles.paymentMethod}>
            <Ionicons name="logo-bitcoin" size={20} color="#F7931A" />
            <Text style={styles.paymentMethodText}>Bitcoin (BTC)</Text>
          </View>
          <View style={styles.paymentMethod}>
            <Text style={styles.usdtIcon}>₮</Text>
            <Text style={styles.paymentMethodText}>Tether (USDT) - TRC20, ERC20</Text>
          </View>
          <View style={styles.paymentMethod}>
            <Ionicons name="logo-usd" size={20} color="#627EEA" />
            <Text style={styles.paymentMethodText}>Ethereum (ETH)</Text>
          </View>
          <View style={styles.paymentMethod}>
            <Ionicons name="card" size={20} color="#00E55A" />
            <Text style={styles.paymentMethodText}>Local Payment Methods</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Deposit Information</Text>
          <Text style={styles.paragraph}>
            Deposit terms and conditions:
          </Text>
          <Text style={styles.listItem}>• Minimum deposit: $10</Text>
          <Text style={styles.listItem}>• Maximum deposit: $100,000 per transaction</Text>
          <Text style={styles.listItem}>• No deposit fees charged by Bynix</Text>
          <Text style={styles.listItem}>• Network fees apply for cryptocurrency transactions</Text>
          <Text style={styles.paragraph}>
            Deposits are credited after the required network confirmations:
          </Text>
          <Text style={styles.listItem}>• Bitcoin: 2 confirmations</Text>
          <Text style={styles.listItem}>• USDT (TRC20): 20 confirmations</Text>
          <Text style={styles.listItem}>• Ethereum: 12 confirmations</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Withdrawal Information</Text>
          <Text style={styles.paragraph}>
            Withdrawal terms and conditions:
          </Text>
          <Text style={styles.listItem}>• Minimum withdrawal: $10</Text>
          <Text style={styles.listItem}>• Maximum withdrawal: $50,000 per day</Text>
          <Text style={styles.listItem}>• Processing time: 1-3 business days</Text>
          <Text style={styles.listItem}>• KYC verification required for all withdrawals</Text>
          <Text style={styles.listItem}>• Withdrawal to same method as deposit (anti-money laundering)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Fees</Text>
          <Text style={styles.paragraph}>
            Fee structure:
          </Text>
          <Text style={styles.listItem}>• Deposit fees: None (network fees may apply)</Text>
          <Text style={styles.listItem}>• Withdrawal fees: Vary by method</Text>
          <Text style={styles.listItem}>• Currency conversion: Market rate + 0.5%</Text>
          <Text style={styles.listItem}>• Inactivity fee: $10/month after 12 months</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Currency</Text>
          <Text style={styles.paragraph}>
            Account balances are maintained in USD. Deposits and withdrawals in other currencies will be converted at prevailing market rates at the time of transaction.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Refund Policy</Text>
          <Text style={styles.paragraph}>
            Deposits used for trading are generally non-refundable. Refund requests may be considered on a case-by-case basis for:
          </Text>
          <Text style={styles.listItem}>• Duplicate deposits</Text>
          <Text style={styles.listItem}>• Technical errors</Text>
          <Text style={styles.listItem}>• Unauthorized transactions</Text>
          <Text style={styles.paragraph}>
            Contact support within 24 hours of the transaction for refund requests.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Security</Text>
          <Text style={styles.paragraph}>
            We implement industry-standard security measures:
          </Text>
          <Text style={styles.listItem}>• Cold storage for cryptocurrency assets</Text>
          <Text style={styles.listItem}>• 2FA authentication</Text>
          <Text style={styles.listItem}>• SSL encryption</Text>
          <Text style={styles.listItem}>• Regular security audits</Text>
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
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F2E',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
  },
  paymentMethodText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  usdtIcon: {
    fontSize: 18,
    color: '#26A17B',
    fontWeight: '700',
  },
  bottomSpacing: {
    height: 50,
  },
});
