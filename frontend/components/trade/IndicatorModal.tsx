import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface ActiveIndicators {
  ma: boolean;
  bollingerBands: boolean;
  rsi: boolean;
  macd: boolean;
  stochastic: boolean;
}

interface IndicatorModalProps {
  visible: boolean;
  onClose: () => void;
  activeIndicators: ActiveIndicators;
  setActiveIndicators: React.Dispatch<React.SetStateAction<ActiveIndicators>>;
}

export default function IndicatorModal({
  visible,
  onClose,
  activeIndicators,
  setActiveIndicators,
}: IndicatorModalProps) {
  const toggleIndicator = (key: keyof ActiveIndicators) => {
    setActiveIndicators(prev => ({ ...prev, [key]: !prev[key] }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Indicators</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            {/* Trend Indicators */}
            <View style={styles.toolsSection}>
              <Text style={styles.toolsSectionTitle}>Trend Indicators</Text>
              <View style={styles.indicatorList}>
                {/* Moving Average */}
                <TouchableOpacity 
                  style={[styles.indicatorItem, activeIndicators.ma && styles.indicatorItemActive]}
                  onPress={() => toggleIndicator('ma')}
                >
                  <View style={[styles.indicatorIcon, { backgroundColor: 'rgba(0, 229, 90, 0.1)' }]}>
                    <Ionicons name="analytics" size={16} color="#00E55A" />
                  </View>
                  <View style={styles.indicatorInfo}>
                    <Text style={styles.indicatorName}>Moving Average (MA)</Text>
                    <Text style={styles.indicatorDesc}>20-period simple moving average</Text>
                  </View>
                  <Switch
                    value={activeIndicators.ma}
                    onValueChange={(value) => setActiveIndicators(prev => ({ ...prev, ma: value }))}
                    trackColor={{ false: '#333', true: 'rgba(0, 229, 90, 0.5)' }}
                    thumbColor={activeIndicators.ma ? '#00E55A' : '#666'}
                    style={styles.switch}
                  />
                </TouchableOpacity>
                
                {/* Bollinger Bands */}
                <TouchableOpacity 
                  style={[styles.indicatorItem, activeIndicators.bollingerBands && styles.indicatorItemActive]}
                  onPress={() => toggleIndicator('bollingerBands')}
                >
                  <View style={[styles.indicatorIcon, { backgroundColor: 'rgba(255, 184, 0, 0.1)' }]}>
                    <Ionicons name="trending-up" size={16} color="#FFB800" />
                  </View>
                  <View style={styles.indicatorInfo}>
                    <Text style={styles.indicatorName}>Bollinger Bands</Text>
                    <Text style={styles.indicatorDesc}>20-period with 2 std deviation</Text>
                  </View>
                  <Switch
                    value={activeIndicators.bollingerBands}
                    onValueChange={(value) => setActiveIndicators(prev => ({ ...prev, bollingerBands: value }))}
                    trackColor={{ false: '#333', true: 'rgba(255, 184, 0, 0.5)' }}
                    thumbColor={activeIndicators.bollingerBands ? '#FFB800' : '#666'}
                    style={styles.switch}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Oscillators */}
            <View style={styles.toolsSection}>
              <Text style={styles.toolsSectionTitle}>Oscillators</Text>
              <View style={styles.indicatorList}>
                {/* RSI */}
                <TouchableOpacity 
                  style={[styles.indicatorItem, activeIndicators.rsi && styles.indicatorItemActive]}
                  onPress={() => toggleIndicator('rsi')}
                >
                  <View style={[styles.indicatorIcon, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
                    <Ionicons name="pulse" size={16} color="#FF6B6B" />
                  </View>
                  <View style={styles.indicatorInfo}>
                    <Text style={styles.indicatorName}>RSI (14)</Text>
                    <Text style={styles.indicatorDesc}>Relative Strength Index</Text>
                  </View>
                  <Switch
                    value={activeIndicators.rsi}
                    onValueChange={(value) => setActiveIndicators(prev => ({ ...prev, rsi: value }))}
                    trackColor={{ false: '#333', true: 'rgba(255, 107, 107, 0.5)' }}
                    thumbColor={activeIndicators.rsi ? '#FF6B6B' : '#666'}
                    style={styles.switch}
                  />
                </TouchableOpacity>
                
                {/* MACD */}
                <TouchableOpacity 
                  style={[styles.indicatorItem, activeIndicators.macd && styles.indicatorItemActive]}
                  onPress={() => toggleIndicator('macd')}
                >
                  <View style={[styles.indicatorIcon, { backgroundColor: 'rgba(155, 89, 182, 0.1)' }]}>
                    <Ionicons name="bar-chart" size={16} color="#9B59B6" />
                  </View>
                  <View style={styles.indicatorInfo}>
                    <Text style={styles.indicatorName}>MACD</Text>
                    <Text style={styles.indicatorDesc}>12, 26, 9 periods</Text>
                  </View>
                  <Switch
                    value={activeIndicators.macd}
                    onValueChange={(value) => setActiveIndicators(prev => ({ ...prev, macd: value }))}
                    trackColor={{ false: '#333', true: 'rgba(155, 89, 182, 0.5)' }}
                    thumbColor={activeIndicators.macd ? '#9B59B6' : '#666'}
                    style={styles.switch}
                  />
                </TouchableOpacity>
                
                {/* Stochastic */}
                <TouchableOpacity 
                  style={[styles.indicatorItem, activeIndicators.stochastic && styles.indicatorItemActive]}
                  onPress={() => toggleIndicator('stochastic')}
                >
                  <View style={[styles.indicatorIcon, { backgroundColor: 'rgba(52, 152, 219, 0.1)' }]}>
                    <Ionicons name="stats-chart" size={16} color="#3498DB" />
                  </View>
                  <View style={styles.indicatorInfo}>
                    <Text style={styles.indicatorName}>Stochastic (14, 3, 3)</Text>
                    <Text style={styles.indicatorDesc}>Momentum oscillator</Text>
                  </View>
                  <Switch
                    value={activeIndicators.stochastic}
                    onValueChange={(value) => setActiveIndicators(prev => ({ ...prev, stochastic: value }))}
                    trackColor={{ false: '#333', true: 'rgba(52, 152, 219, 0.5)' }}
                    thumbColor={activeIndicators.stochastic ? '#3498DB' : '#666'}
                    style={styles.switch}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toolsSection: {
    marginBottom: 14,
  },
  toolsSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  indicatorList: {
    gap: 6,
  },
  indicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252540',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  indicatorItemActive: {
    borderColor: 'rgba(0, 229, 90, 0.3)',
    backgroundColor: 'rgba(0, 229, 90, 0.05)',
  },
  indicatorIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  indicatorInfo: {
    flex: 1,
  },
  indicatorName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 1,
  },
  indicatorDesc: {
    fontSize: 10,
    color: '#888',
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
});
