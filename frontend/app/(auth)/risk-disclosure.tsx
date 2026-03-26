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

export default function RiskDisclosure() {
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
        <Text style={styles.title}>Risk Disclosure</Text>
        <Text style={styles.lastUpdated}>Last Updated: January 2024</Text>

        <View style={styles.warningBox}>
          <Ionicons name="warning" size={24} color="#FFB800" />
          <Text style={styles.warningText}>
            Trading involves significant risk of loss and is not suitable for all investors. Please read this disclosure carefully.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. General Risk Warning</Text>
          <Text style={styles.paragraph}>
            Trading Forex, CFDs, and other leveraged financial instruments involves substantial risk of loss and may not be suitable for all investors. The high degree of leverage can work against you as well as for you. Before deciding to trade, you should carefully consider your investment objectives, level of experience, and risk appetite.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Market Risk</Text>
          <Text style={styles.paragraph}>
            Financial markets are subject to various risks including:
          </Text>
          <Text style={styles.listItem}>• Price volatility and rapid market movements</Text>
          <Text style={styles.listItem}>• Gaps in pricing, especially during market openings</Text>
          <Text style={styles.listItem}>• Slippage during execution of orders</Text>
          <Text style={styles.listItem}>• Economic and political events affecting markets</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Leverage Risk</Text>
          <Text style={styles.paragraph}>
            Leverage allows you to control larger positions with a smaller initial investment. While this can amplify profits, it can also amplify losses. You may lose more than your initial deposit, and you may be required to deposit additional funds to maintain your positions.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Cryptocurrency Risk</Text>
          <Text style={styles.paragraph}>
            Cryptocurrency trading carries additional risks:
          </Text>
          <Text style={styles.listItem}>• Extreme price volatility</Text>
          <Text style={styles.listItem}>• Regulatory uncertainty</Text>
          <Text style={styles.listItem}>• Technology and security risks</Text>
          <Text style={styles.listItem}>• Limited liquidity in some markets</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. No Guarantee of Profit</Text>
          <Text style={styles.paragraph}>
            Past performance is not indicative of future results. No representation is being made that any account will or is likely to achieve profits or losses similar to those shown. There is no guarantee that you will make money using our services.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. System Risks</Text>
          <Text style={styles.paragraph}>
            Electronic trading systems are subject to:
          </Text>
          <Text style={styles.listItem}>• System failures and technical issues</Text>
          <Text style={styles.listItem}>• Internet connectivity problems</Text>
          <Text style={styles.listItem}>• Cybersecurity threats</Text>
          <Text style={styles.listItem}>• Delays in order execution</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Recommendation</Text>
          <Text style={styles.paragraph}>
            We strongly recommend that you:
          </Text>
          <Text style={styles.listItem}>• Only trade with money you can afford to lose</Text>
          <Text style={styles.listItem}>• Seek independent financial advice if needed</Text>
          <Text style={styles.listItem}>• Educate yourself about trading before starting</Text>
          <Text style={styles.listItem}>• Use risk management tools like stop-loss orders</Text>
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB80020',
    borderWidth: 1,
    borderColor: '#FFB800',
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#FFB800',
    lineHeight: 20,
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
