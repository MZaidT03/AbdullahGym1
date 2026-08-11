import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatCard from './StatCard';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const MembershipCard = ({
  planName = 'Pro Membership',
  memberId = 'ID: 9876-5432',
  daysRemaining = 14,
  isCheckedIn = false,
  checkInTime = null,
}) => {
  return (
    <View style={styles.card}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.planName}>{planName}</Text>
          <Text style={styles.memberId}>{memberId}</Text>
        </View>
        <View style={styles.badgeCircle}>
          <Ionicons name="ribbon" size={20} color={colors.primary} />
        </View>
      </View>

      {/* Two sub stat cards */}
      <View style={styles.statsRow}>
        <StatCard
          label="Days Remaining"
          value={`${daysRemaining} Days`}
        />
        <View style={styles.spacer} />
        <StatCard
          label="Today's Status"
          value={isCheckedIn ? `Checked In ${checkInTime ? `(${checkInTime})` : ''}` : 'Pending'}
          status={isCheckedIn ? 'CheckedIn' : 'Pending'}
          icon={
            isCheckedIn ? (
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            ) : (
              <Ionicons name="ellipsis-horizontal-circle" size={16} color={colors.warning} />
            )
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackgroundAlt,
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
    marginBottom: 14,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  memberId: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsRow: {
    flexDirection: 'row',
  },
  spacer: {
    width: 10,
  },
});

export default MembershipCard;
