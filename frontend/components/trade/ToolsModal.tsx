import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TIMEFRAMES } from '../../constants/tradeConfig';

interface ToolsModalProps {
  visible: boolean;
  onClose: () => void;
  chartType: 'candle' | 'line' | 'bar';
  setChartType: (type: 'candle' | 'line' | 'bar') => void;
  timeframe: string;
  setTimeframe: (tf: string) => void;
  selectedDrawTool: string | null;
  setSelectedDrawTool: (tool: string | null) => void;
  setTrendLineStartPoint: (point: null) => void;
  setHorizontalLines: (lines: any[]) => void;
  setTrendLines: (lines: any[]) => void;
}

export default function ToolsModal({
  visible,
  onClose,
  chartType,
  setChartType,
  timeframe,
  setTimeframe,
  selectedDrawTool,
  setSelectedDrawTool,
  setTrendLineStartPoint,
  setHorizontalLines,
  setTrendLines,
}: ToolsModalProps) {
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
            <Text style={styles.modalTitle}>Chart Tools</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Chart Type Section */}
          <View style={styles.toolsSection}>
            <Text style={styles.toolsSectionTitle}>Chart Type</Text>
            <View style={styles.chartTypeGrid}>
              <TouchableOpacity
                style={[styles.chartTypeItem, chartType === 'candle' && styles.chartTypeItemActive]}
                onPress={() => {
                  setChartType('candle');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Ionicons name="bar-chart" size={24} color={chartType === 'candle' ? '#00E55A' : '#888'} />
                <Text style={[styles.chartTypeText, chartType === 'candle' && styles.chartTypeTextActive]}>Candle</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.chartTypeItem, chartType === 'line' && styles.chartTypeItemActive]}
                onPress={() => {
                  setChartType('line');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Ionicons name="analytics" size={24} color={chartType === 'line' ? '#00E55A' : '#888'} />
                <Text style={[styles.chartTypeText, chartType === 'line' && styles.chartTypeTextActive]}>Line</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.chartTypeItem, chartType === 'bar' && styles.chartTypeItemActive]}
                onPress={() => {
                  setChartType('bar');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Ionicons name="stats-chart" size={24} color={chartType === 'bar' ? '#00E55A' : '#888'} />
                <Text style={[styles.chartTypeText, chartType === 'bar' && styles.chartTypeTextActive]}>Bar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Candle Time Section */}
          <View style={styles.toolsSection}>
            <Text style={styles.toolsSectionTitle}>Candle Time</Text>
            <View style={styles.candleTimeGrid}>
              {TIMEFRAMES.map((tf) => (
                <TouchableOpacity
                  key={tf.value}
                  style={[styles.candleTimeItem, timeframe === tf.value && styles.candleTimeItemActive]}
                  onPress={() => {
                    setTimeframe(tf.value);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.candleTimeText, timeframe === tf.value && styles.candleTimeTextActive]}>
                    {tf.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Drawing Tools Section */}
          <View style={styles.toolsSection}>
            <Text style={styles.toolsSectionTitle}>Drawing Tools</Text>
            <View style={styles.drawToolsGrid}>
              {/* Horizontal Line */}
              <TouchableOpacity
                style={[styles.drawToolItem, selectedDrawTool === 'horizontal' && styles.drawToolItemActive]}
                onPress={() => {
                  setSelectedDrawTool(selectedDrawTool === 'horizontal' ? null : 'horizontal');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onClose();
                }}
              >
                <View style={styles.drawToolIcon}>
                  <Ionicons name="remove" size={24} color={selectedDrawTool === 'horizontal' ? '#FFB800' : '#FFFFFF'} />
                </View>
                <Text style={[styles.drawToolText, selectedDrawTool === 'horizontal' && styles.drawToolTextActive]}>
                  Horizontal Line
                </Text>
              </TouchableOpacity>

              {/* Trend Line */}
              <TouchableOpacity
                style={[styles.drawToolItem, selectedDrawTool === 'trendline' && styles.drawToolItemActive]}
                onPress={() => {
                  setSelectedDrawTool('trendline');
                  setTrendLineStartPoint(null);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onClose();
                }}
              >
                <View style={styles.drawToolIcon}>
                  <Ionicons name="trending-up" size={24} color={selectedDrawTool === 'trendline' ? '#FFB800' : '#FFFFFF'} />
                </View>
                <Text style={[styles.drawToolText, selectedDrawTool === 'trendline' && styles.drawToolTextActive]}>
                  Trend Line
                </Text>
              </TouchableOpacity>

              {/* Vertical Line */}
              <TouchableOpacity
                style={[styles.drawToolItem, selectedDrawTool === 'vertical' && styles.drawToolItemActive]}
                onPress={() => {
                  setSelectedDrawTool(selectedDrawTool === 'vertical' ? null : 'vertical');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert('Vertical Line', 'Tap on the chart to draw a vertical line.');
                  onClose();
                }}
              >
                <View style={styles.drawToolIcon}>
                  <View style={styles.verticalLineIcon} />
                </View>
                <Text style={[styles.drawToolText, selectedDrawTool === 'vertical' && styles.drawToolTextActive]}>
                  Vertical Line
                </Text>
              </TouchableOpacity>

              {/* Clear All */}
              <TouchableOpacity
                style={styles.drawToolItem}
                onPress={() => {
                  setSelectedDrawTool(null);
                  setHorizontalLines([]);
                  setTrendLines([]);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  Alert.alert('Clear Drawings', 'All drawings have been cleared.');
                  onClose();
                }}
              >
                <View style={[styles.drawToolIcon, { backgroundColor: 'rgba(255, 59, 59, 0.15)' }]}>
                  <Ionicons name="trash" size={24} color="#FF3B3B" />
                </View>
                <Text style={[styles.drawToolText, { color: '#FF3B3B' }]}>
                  Clear All
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toolsSection: {
    marginBottom: 20,
  },
  toolsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
  },
  chartTypeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  chartTypeItem: {
    flex: 1,
    backgroundColor: '#252540',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chartTypeItemActive: {
    borderColor: '#00E55A',
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
  },
  chartTypeText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  chartTypeTextActive: {
    color: '#00E55A',
  },
  candleTimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  candleTimeItem: {
    backgroundColor: '#252540',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  candleTimeItemActive: {
    borderColor: '#00E55A',
    backgroundColor: 'rgba(0, 229, 90, 0.1)',
  },
  candleTimeText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '600',
  },
  candleTimeTextActive: {
    color: '#00E55A',
  },
  drawToolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  drawToolItem: {
    width: '47%',
    backgroundColor: '#252540',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  drawToolItemActive: {
    borderColor: '#FFB800',
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
  },
  drawToolIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawToolText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  drawToolTextActive: {
    color: '#FFB800',
  },
  verticalLineIcon: {
    width: 2,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
});
