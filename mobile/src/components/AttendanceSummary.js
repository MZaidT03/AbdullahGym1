import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const AttendanceSummary = ({ percentage = 85, presentCount = 14, absentCount = 4 }) => {
  return (
    <View style={styles.container}>
      {/* 3 Overview Metric Capsules */}
      <View style={styles.capsule}>
        <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
          <Ionicons name="pie-chart" size={16} color={colors.primaryDark} />
        </View>
        <Text style={styles.valueText}>{percentage}%</Text>
        <Text style={styles.labelText}>ATTENDANCE</Text>
        <Text style={styles.subText}>This Month</Text>
      </View>

      <View style={styles.capsule}>
        <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
          <Ionicons name="barbell" size={16} color={colors.primaryDark} />
        </View>
        <Text style={[styles.valueText, { color: colors.primaryDark }]}>{presentCount}</Text>
        <Text style={styles.labelText}>SESSIONS</Text>
        <Text style={styles.subText}>Completed</Text>
      </View>

      <View style={styles.capsule}>
        <View style={[styles.iconBox, { backgroundColor: '#F8FAFC' }]}>
          <Ionicons name="bed-outline" size={16} color={colors.textSecondary} />
        </View>
        <Text style={[styles.valueText, { color: colors.textSecondary }]}>{absentCount}</Text>
        <Text style={styles.labelText}>REST DAYS</Text>
        <Text style={styles.subText}>Recovery</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  capsule: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...theme.shadows.soft,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  valueText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  labelText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.6,
    marginTop: 2,
  },
  subText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 1,
  },
});

export default AttendanceSummary;
