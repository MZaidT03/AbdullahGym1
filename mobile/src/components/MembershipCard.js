import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const MembershipCard = ({
  planName = 'Pro Membership',
  memberId = 'ID: 9876-5432',
  daysRemaining = 30,
  isCheckedIn = false,
  checkInTime = null,
}) => {
  const progressRatio = Math.max(0, Math.min(1, daysRemaining / 30));

  return (
    <View style={styles.card}>
      {/* Top Tag & Plan Header */}
      <View style={styles.topRow}>
        <View style={styles.planInfo}>
          <View style={styles.tagRow}>
            <Text style={styles.membershipTag}>MEMBERSHIP PLAN</Text>
            <View style={styles.activeDot} />
          </View>
          <Text style={styles.planName}>{planName}</Text>
        </View>

        <View style={styles.idCapsule}>
          <Ionicons name="finger-print" size={12} color={colors.primaryDark} />
          <Text style={styles.idText}>{memberId.replace('ID: ', '')}</Text>
        </View>
      </View>

      {/* Progress Bar for Days Remaining */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>Plan Validity</Text>
          <Text style={styles.progressValue}>
            <Text style={styles.daysHighlight}>{daysRemaining}</Text> / 30 Days Left
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressRatio * 100}%` }]} />
        </View>
      </View>

      {/* Status Bar */}
      <View style={styles.statusFooter}>
        <View style={styles.statusLeft}>
          <Ionicons
            name={isCheckedIn ? 'checkmark-circle' : 'time-outline'}
            size={16}
            color={isCheckedIn ? colors.primaryDark : colors.textMuted}
          />
          <Text style={styles.statusLabel}>
            {isCheckedIn ? 'Checked in today' : 'Daily Attendance:'}
          </Text>
        </View>

        <View style={[styles.statusBadge, isCheckedIn ? styles.statusBadgeDone : styles.statusBadgePending]}>
          <Text style={[styles.statusBadgeText, isCheckedIn ? styles.statusTextDone : styles.statusTextPending]}>
            {isCheckedIn ? (checkInTime ? `At ${checkInTime}` : 'Present ✓') : 'Not Checked In'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    ...theme.shadows.soft,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planInfo: {
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  membershipTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  idCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  idText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  progressSection: {
    marginVertical: 10,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  progressValue: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  daysHighlight: {
    fontWeight: '800',
    color: colors.primaryDark,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  statusFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeDone: {
    backgroundColor: '#F0FDF4',
  },
  statusBadgePending: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextDone: {
    color: colors.primaryDark,
  },
  statusTextPending: {
    color: colors.textMuted,
  },
});

export default MembershipCard;
