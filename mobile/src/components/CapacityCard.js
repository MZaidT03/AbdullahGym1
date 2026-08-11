import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const CapacityCard = ({
  percentage = 70,
  statusText = 'Moderately Busy',
  barColor = colors.warning,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Current Capacity</Text>
        <View style={styles.iconContainer}>
          <Ionicons name="people" size={18} color={colors.warning} />
        </View>
      </View>

      <Text style={styles.percentText}>{percentage}% Full</Text>

      {/* Bar Track */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percentage}%`, backgroundColor: barColor }]} />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.statusLabel}>{statusText}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    ...theme.shadows.soft,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warningLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  track: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  footerRow: {
    alignItems: 'flex-end',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

export default CapacityCard;
