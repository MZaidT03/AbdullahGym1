import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const PaymentCard = ({
  title = 'Membership Fee',
  date = 'Dec 01, 2024',
  amount = '$120',
  status = 'PAID',
  isCurrent = false,
  nextDate = 'Dec 31, 2024',
}) => {
  if (isCurrent) {
    return (
      <View style={styles.currentCard}>
        <View style={styles.currentHeader}>
          <View>
            <Text style={styles.currentSub}>Current Membership</Text>
            <Text style={styles.currentTitle}>{title}</Text>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeText}>Active</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsRow}>
          <View>
            <Text style={styles.metaLabel}>Membership Fee</Text>
            <Text style={styles.metaValue}>{amount}/mo</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.metaLabel}>Next Payment</Text>
            <Text style={styles.metaValue}>{nextDate}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.historyCard}>
      <View style={styles.historyIconCircle}>
        <Ionicons name="receipt-outline" size={18} color={colors.primaryDark} />
      </View>
      <View style={styles.historyContent}>
        <Text style={styles.historyTitle}>{title}</Text>
        <Text style={styles.historyDate}>{date}</Text>
      </View>
      <View style={styles.historyRight}>
        <Text style={styles.historyAmount}>{amount}</Text>
        <View style={styles.paidBadge}>
          <Text style={styles.paidText}>{status}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  currentCard: {
    backgroundColor: colors.cardBackgroundAlt,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    ...theme.shadows.soft,
  },
  currentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentSub: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  historyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    ...theme.shadows.soft,
  },
  historyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  historyDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  paidBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paidText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
  },
});

export default PaymentCard;
