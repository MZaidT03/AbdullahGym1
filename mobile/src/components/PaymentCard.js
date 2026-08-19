import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const PaymentCard = ({
  title = 'Monthly Membership Fee',
  date = 'Dec 01, 2024',
  amount = 'PKR 5,000',
  status = 'Paid',
  isCurrent = false,
  nextDate = 'Dec 31, 2024',
  method = 'Cash Desk',
  invoiceId = 'INV-2026-084',
}) => {
  const getBadgeConfig = (st) => {
    const s = (st || '').toUpperCase();
    if (s.includes('PENDING')) {
      return { bg: '#FEF3C7', text: '#D97706', dot: '#F59E0B', label: 'PENDING APPROVAL' };
    }
    if (s.includes('PAID')) {
      return { bg: '#F0FDF4', text: colors.primaryDark, dot: '#22C55E', label: 'PAID ✓' };
    }
    if (s.includes('REJECTED') || s.includes('FAILED')) {
      return { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444', label: 'REJECTED' };
    }
    return { bg: '#F1F5F9', text: colors.textSecondary, dot: '#94A3B8', label: st || 'UNPAID' };
  };

  const badge = getBadgeConfig(status);

  // Clean title: remove redundant (PKR ...) or [Add-ons: ...]
  const cleanedTitle = (title || 'Monthly Membership Fee')
    .split(' [Add-ons:')[0]
    .split(' [Next:')[0]
    .replace(/\s*\(PKR.*?\)/i, '')
    .trim();

  if (isCurrent) {
    return (
      <View style={styles.currentCard}>
        <View style={styles.glowOverlay} />

        <View style={styles.currentHeader}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.billingTag}>ACTIVE SUBSCRIPTION BILLING</Text>
            <Text style={styles.currentTitle} numberOfLines={2}>{cleanedTitle}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: badge.bg, flexShrink: 0 }]}>
            <View style={[styles.statusDot, { backgroundColor: badge.dot }]} />
            <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.detailsGrid}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>FEE AMOUNT</Text>
            <Text style={styles.detailAmount}>{amount}</Text>
          </View>

          <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
            <Text style={styles.detailLabel}>NEXT DUE DATE</Text>
            <Text style={styles.detailDate}>{nextDate}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.historyCard}>
      <View style={styles.historyLeft}>
        <View style={styles.historyIconBox}>
          <Ionicons name="receipt" size={18} color={colors.primaryDark} />
        </View>
        <View style={styles.historyTextCol}>
          <Text style={styles.historyTitle} numberOfLines={1} ellipsizeMode="tail">
            {cleanedTitle}
          </Text>
          <Text style={styles.historyMeta} numberOfLines={1} ellipsizeMode="tail">
            {date} • <Text style={styles.methodText}>{method}</Text>
          </Text>
          {invoiceId ? <Text style={styles.invoiceText}>{invoiceId}</Text> : null}
        </View>
      </View>

      <View style={styles.historyRight}>
        <Text style={styles.historyAmount} numberOfLines={1}>{amount}</Text>
        <View style={[styles.historyBadge, { backgroundColor: badge.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: badge.dot }]} />
          <Text style={[styles.historyBadgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  currentCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    ...theme.shadows.medium,
  },
  glowOverlay: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(22, 196, 91, 0.18)',
  },
  currentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  billingTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  currentTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.white,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 14,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailCol: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  detailAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  detailDate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  historyCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    ...theme.shadows.soft,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  historyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  historyTextCol: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  historyMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  methodText: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  invoiceText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  historyRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
    gap: 3,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  historyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  historyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
});

export default PaymentCard;
