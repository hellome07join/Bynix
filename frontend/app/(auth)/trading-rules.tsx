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

export default function TradingRules() {
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
        <Text style={styles.title}>Rules of Trading Operations</Text>
        <Text style={styles.lastUpdated}>Last Updated: January 2024</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Trading Hours</Text>
          <Text style={styles.paragraph}>
            Trading hours vary by asset class:
          </Text>
          <Text style={styles.listItem}>• Forex: Sunday 22:00 GMT to Friday 22:00 GMT</Text>
          <Text style={styles.listItem}>• Cryptocurrencies: 24/7</Text>
          <Text style={styles.listItem}>• Stocks: During respective exchange hours</Text>
          <Text style={styles.listItem}>• Commodities: Varies by product</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Order Types</Text>
          <Text style={styles.paragraph}>
            Available order types include:
          </Text>
          <Text style={styles.listItem}>• Market Orders: Executed at current market price</Text>
          <Text style={styles.listItem}>• Limit Orders: Executed at specified price or better</Text>
          <Text style={styles.listItem}>• Stop Orders: Triggered when price reaches specified level</Text>
          <Text style={styles.listItem}>• Take Profit: Automatically close position at profit target</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Minimum Trade Requirements</Text>
          <Text style={styles.paragraph}>
            Minimum requirements for trading:
          </Text>
          <Text style={styles.listItem}>• Minimum trade amount: $1</Text>
          <Text style={styles.listItem}>• Minimum deposit: $10</Text>
          <Text style={styles.listItem}>• Maximum trade amount: Varies by asset and account type</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Leverage and Margin</Text>
          <Text style={styles.paragraph}>
            Leverage varies by asset class and regulatory requirements. Margin requirements must be maintained at all times. Failure to maintain adequate margin may result in automatic position closure.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Trade Execution</Text>
          <Text style={styles.paragraph}>
            Orders are executed on a best-effort basis. During high volatility or low liquidity periods:
          </Text>
          <Text style={styles.listItem}>• Slippage may occur</Text>
          <Text style={styles.listItem}>• Spreads may widen</Text>
          <Text style={styles.listItem}>• Order execution may be delayed</Text>
          <Text style={styles.listItem}>• Requotes may be issued</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Prohibited Activities</Text>
          <Text style={styles.paragraph}>
            The following activities are strictly prohibited:
          </Text>
          <Text style={styles.listItem}>• Market manipulation</Text>
          <Text style={styles.listItem}>• Arbitrage abuse</Text>
          <Text style={styles.listItem}>• Use of insider information</Text>
          <Text style={styles.listItem}>• Scalping during news events</Text>
          <Text style={styles.listItem}>• Using multiple accounts for bonus abuse</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Position Limits</Text>
          <Text style={styles.paragraph}>
            Maximum position sizes and number of open positions may be limited based on account type, asset class, and market conditions. These limits are designed to manage risk exposure.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Payout Structure</Text>
          <Text style={styles.paragraph}>
            Payout percentages vary by asset and market conditions. Typical payouts range from 70% to 95% for winning trades. Exact payout rates are displayed before trade execution.
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
