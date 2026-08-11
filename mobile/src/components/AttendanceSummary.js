import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const AttendanceSummary = ({ percentage = 85, presentCount = 17, absentCount = 3 }) => {
  return (
    <View style={styles.containerRow}>
      {/* Percentage Big Card */}
      <View style={styles.percentageCard}>
        <Text style={styles.percentageText}>{percentage}%</Text>
        <Text style={styles.percentageLabel}>ATTENDANCE</Text>
      </View>

      {/* Counts Stack Card */}
      <View style={styles.countsCard}>
        <View style={styles.countRow}>
          <Text style={styles.countLabel}>Present</Text>
          <Text style={[styles.countValue, styles.presentValue]}>{presentCount}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.countRow}>
          <Text style={styles.countLabel}>Absent</Text>
          <Text style={[styles.countValue, styles.absentValue]}>{absentCount}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  containerRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  percentageCard: {
    flex: 1.1,
    backgroundColor: colors.cardBackgroundAlt,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.soft,
  },
  percentageText: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -1,
  },
  percentageLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  countsCard: {
    flex: 1,
    backgroundColor: colors.cardBackgroundAlt,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    ...theme.shadows.soft,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  countLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  countValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  presentValue: {
    color: colors.primaryDark,
  },
  absentValue: {
    color: colors.danger,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
});

export default AttendanceSummary;
