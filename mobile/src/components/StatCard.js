import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const StatCard = ({ label, value, status, icon }) => {
  return (
    <View style={styles.cardContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
        <Text style={[styles.value, status === 'Pending' && styles.pendingValue]}>
          {value}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    ...theme.shadows.soft,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 6,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  pendingValue: {
    color: colors.textPrimary,
  },
});

export default StatCard;
