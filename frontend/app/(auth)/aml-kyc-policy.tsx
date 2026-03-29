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

export default function AMLKYCPolicy() {
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
        <Text style={styles.title}>AML & KYC Policy</Text>
        <Text style={styles.lastUpdated}>Last Updated: January 2024</Text>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark" size={24} color="#00E55A" />
          <Text style={styles.infoText}>
            Bynix is committed to preventing money laundering and terrorist financing through strict compliance measures.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.paragraph}>
            This Anti-Money Laundering (AML) and Know Your Customer (KYC) Policy outlines our commitment to preventing the use of our services for money laundering, terrorist financing, or other illegal activities.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. KYC Requirements</Text>
          <Text style={styles.paragraph}>
            All clients must complete identity verification before:
          </Text>
          <Text style={styles.listItem}>• Making withdrawals</Text>
          <Text style={styles.listItem}>• Depositing amounts exceeding $1,000</Text>
          <Text style={styles.listItem}>• Opening a live trading account</Text>
          <Text style={styles.sectionSubTitle}>Required Documents:</Text>
          <Text style={styles.listItem}>• Government-issued photo ID (passport, national ID, driver's license)</Text>
          <Text style={styles.listItem}>• Proof of address (utility bill, bank statement - less than 3 months old)</Text>
          <Text style={styles.listItem}>• Selfie with ID document</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Verification Process</Text>
          <Text style={styles.paragraph}>
            Our verification process includes:
          </Text>
          <Text style={styles.listItem}>• Document authenticity verification</Text>
          <Text style={styles.listItem}>• Identity verification through Didit.me</Text>
          <Text style={styles.listItem}>• Address verification</Text>
          <Text style={styles.listItem}>• Sanctions list screening</Text>
          <Text style={styles.listItem}>• PEP (Politically Exposed Person) screening</Text>
          <Text style={styles.paragraph}>
            Verification typically takes 24-48 hours. Additional documentation may be requested.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Transaction Monitoring</Text>
          <Text style={styles.paragraph}>
            We monitor all transactions for suspicious activity, including:
          </Text>
          <Text style={styles.listItem}>• Unusual transaction patterns</Text>
          <Text style={styles.listItem}>• Transactions inconsistent with client profile</Text>
          <Text style={styles.listItem}>• Large or frequent transactions</Text>
          <Text style={styles.listItem}>• Transactions to/from high-risk jurisdictions</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Suspicious Activity Reporting</Text>
          <Text style={styles.paragraph}>
            We are obligated to report suspicious transactions to relevant authorities. We may:
          </Text>
          <Text style={styles.listItem}>• Freeze accounts pending investigation</Text>
          <Text style={styles.listItem}>• Request additional documentation</Text>
          <Text style={styles.listItem}>• Terminate accounts engaged in suspicious activity</Text>
          <Text style={styles.listItem}>• Report to Financial Intelligence Units (FIUs)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Prohibited Activities</Text>
          <Text style={styles.paragraph}>
            The following are strictly prohibited:
          </Text>
          <Text style={styles.listItem}>• Money laundering</Text>
          <Text style={styles.listItem}>• Terrorist financing</Text>
          <Text style={styles.listItem}>• Fraud and identity theft</Text>
          <Text style={styles.listItem}>• Using accounts for third parties</Text>
          <Text style={styles.listItem}>• Providing false information</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Record Keeping</Text>
          <Text style={styles.paragraph}>
            We maintain records of:
          </Text>
          <Text style={styles.listItem}>• Client identification documents</Text>
          <Text style={styles.listItem}>• Transaction records</Text>
          <Text style={styles.listItem}>• Verification procedures</Text>
          <Text style={styles.listItem}>• Communication records</Text>
          <Text style={styles.paragraph}>
            Records are retained for a minimum of 5 years after account closure.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Compliance Team</Text>
          <Text style={styles.paragraph}>
            Our dedicated compliance team oversees AML/KYC procedures. For questions or concerns, contact:
          </Text>
          <Text style={styles.contactInfo}>Email: compliance@bynix.io</Text>
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E55A15',
    borderWidth: 1,
    borderColor: '#00E55A40',
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#00E55A',
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
  sectionSubTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 10,
    marginBottom: 8,
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
  contactInfo: {
    fontSize: 14,
    color: '#00E55A',
    lineHeight: 22,
  },
  bottomSpacing: {
    height: 50,
  },
});
