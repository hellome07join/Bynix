import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FAQ_DATA = [
  {
    id: 1,
    question: 'How do I start trading?',
    answer: 'Go to the Trade tab, select an asset, choose your investment amount and duration, then click UP or DOWN to predict the price movement.',
  },
  {
    id: 2,
    question: 'What is Demo Account?',
    answer: 'Demo account allows you to practice trading with virtual money. You can add demo balance anytime and test your strategies risk-free.',
  },
  {
    id: 3,
    question: 'How do I deposit funds?',
    answer: 'Click on the Deposit button in the Trade screen header, then follow the instructions to add funds to your live account.',
  },
  {
    id: 4,
    question: 'How long does withdrawal take?',
    answer: 'Withdrawals are typically processed within 24-48 hours after admin approval. Crypto withdrawals may be faster.',
  },
  {
    id: 5,
    question: 'What is the minimum trade amount?',
    answer: 'The minimum trade amount is $1. You can trade with amounts from $1 to $10,000 per trade.',
  },
  {
    id: 6,
    question: 'How is profit calculated?',
    answer: 'Profit is calculated based on the payout percentage shown for each asset. If you win, you receive your investment plus the profit percentage.',
  },
];

const SUPPORT_OPTIONS = [
  { id: 1, icon: 'mail', title: 'Email Support', subtitle: 'support@bynix.io', action: 'email' },
];

export default function Support() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const handleSupportAction = (action: string) => {
    switch (action) {
      case 'email':
        Linking.openURL('mailto:support@bynix.io');
        break;
      case 'whatsapp':
        Linking.openURL('https://wa.me/12345678900');
        break;
      case 'telegram':
        Linking.openURL('https://t.me/BynixSupport');
        break;
      case 'chat':
        Alert.alert('Live Chat', 'Live chat feature coming soon!');
        break;
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      Alert.alert('Message Sent', 'Our support team will get back to you within 24 hours.');
      setMessage('');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Support</Text>
        <Text style={styles.headerSubtitle}>We're here to help</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Contact Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.contactGrid}>
            {SUPPORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.contactCard}
                onPress={() => handleSupportAction(option.action)}
              >
                <View style={styles.contactIconWrapper}>
                  <Ionicons name={option.icon as any} size={24} color="#00E55A" />
                </View>
                <Text style={styles.contactTitle}>{option.title}</Text>
                <Text style={styles.contactSubtitle}>{option.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Send Message */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send us a message</Text>
          <View style={styles.messageCard}>
            <TextInput
              style={styles.messageInput}
              placeholder="Describe your issue or question..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />
            <TouchableOpacity 
              style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!message.trim()}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
              <Text style={styles.sendButtonText}>Send Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {FAQ_DATA.map((faq) => (
            <TouchableOpacity
              key={faq.id}
              style={styles.faqCard}
              onPress={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons 
                  name={expandedFAQ === faq.id ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color="#00E55A" 
                />
              </View>
              {expandedFAQ === faq.id && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Image 
            source={require('../../assets/images/bynix-logo.png')}
            style={styles.footerLogo}
            resizeMode="contain"
          />
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appCopyright}>© 2025 Bynix Trading. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1A0F',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(15, 20, 40, 0.95)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  contactCard: {
    width: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  contactIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 229, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactSubtitle: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
  },
  messageCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  messageInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 100,
    marginBottom: 12,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E55A',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  faqCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  faqAnswer: {
    color: '#999',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 8,
  },
  footerLogo: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  appName: {
    color: '#00E55A',
    fontSize: 18,
    fontWeight: '800',
  },
  appVersion: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  appCopyright: {
    color: '#444',
    fontSize: 11,
    marginTop: 8,
  },
});
