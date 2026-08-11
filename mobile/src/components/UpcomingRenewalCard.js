import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const UpcomingRenewalCard = ({ daysRemaining = 14, onRenewPress }) => {
  return (
    <View style={styles.card}>
      <View style={styles.iconColumn}>
        <Ionicons name="warning-outline" size={22} color={colors.danger} />
      </View>
      <View style={styles.contentColumn}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Upcoming Renewal</Text>
          <TouchableOpacity onPress={onRenewPress} activeOpacity={0.7}>
            <Text style={styles.renewAction}>Renew</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.description}>
          Your membership expires in {daysRemaining} days.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dangerLight,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    ...theme.shadows.soft,
  },
  iconColumn: {
    marginRight: 10,
    marginTop: 2,
  },
  contentColumn: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dangerDark,
  },
  renewAction: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    textDecorationLine: 'underline',
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});

export default UpcomingRenewalCard;
