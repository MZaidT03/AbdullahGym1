import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const UpcomingRenewalCard = ({
  daysRemaining = 30,
  overdueDays = 0,
  status = 'Active',
  onRenewPress,
}) => {
  const isDeactivated = status === 'Inactive' || status === 'Deactivated' || overdueDays > 7;

  // 1. Active Period (>3 days remaining & 0 overdue): Keep dashboard clean by returning null
  if (daysRemaining > 3 && overdueDays === 0 && !isDeactivated) {
    return null;
  }

  // Determine Banner Variant: 'yellow' (amber), 'red' (danger), 'deactivated' (critical red), or 'info'
  let variant = 'info';
  let title = 'Upcoming Renewal';
  let description = `Your membership expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`;
  let iconName = 'time-outline';

  if (isDeactivated) {
    variant = 'deactivated';
    title = 'Account Deactivated ❌';
    description = '7-day grace period limit exceeded. Please renew your membership to reactivate check-in access.';
    iconName = 'close-circle-outline';
  } else if (overdueDays >= 3 && overdueDays <= 7) {
    variant = 'red';
    title = 'Urgent Renewal Required 🚨';
    description = `Membership overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}. Account will be deactivated after 7 days!`;
    iconName = 'warning-outline';
  } else if (overdueDays >= 1 && overdueDays <= 2) {
    variant = 'yellow';
    title = 'Renewal Pending ⚠️';
    description = `Month completed (Grace period: Day ${overdueDays} of 7). Please pay your monthly fee.`;
    iconName = 'alert-circle-outline';
  } else if (daysRemaining <= 3 && daysRemaining >= 0) {
    variant = 'info';
    title = 'Renewal Notice';
    description = `Your membership month expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`;
    iconName = 'information-circle-outline';
  }

  const getCardStyle = () => {
    switch (variant) {
      case 'yellow':
        return styles.yellowCard;
      case 'red':
        return styles.redCard;
      case 'deactivated':
        return styles.deactivatedCard;
      default:
        return styles.infoCard;
    }
  };

  const getTitleStyle = () => {
    switch (variant) {
      case 'yellow':
        return styles.yellowTitle;
      case 'red':
        return styles.redTitle;
      case 'deactivated':
        return styles.deactivatedTitle;
      default:
        return styles.infoTitle;
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'yellow':
        return '#D97706';
      case 'red':
        return '#DC2626';
      case 'deactivated':
        return '#991B1B';
      default:
        return '#3B82F6';
    }
  };

  return (
    <View style={[styles.card, getCardStyle()]}>
      <View style={styles.iconColumn}>
        <Ionicons name={iconName} size={24} color={getIconColor()} />
      </View>
      <View style={styles.contentColumn}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, getTitleStyle()]}>{title}</Text>
          <TouchableOpacity onPress={onRenewPress} activeOpacity={0.7}>
            <Text style={styles.renewAction}>
              {isDeactivated ? 'Reactivate' : 'Renew'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    ...theme.shadows.soft,
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  yellowCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  redCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  deactivatedCard: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
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
  },
  infoTitle: {
    color: '#1D4ED8',
  },
  yellowTitle: {
    color: '#B45309',
  },
  redTitle: {
    color: '#B91C1C',
  },
  deactivatedTitle: {
    color: '#991B1B',
  },
  renewAction: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
    textDecorationLine: 'underline',
  },
  description: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
});

export default UpcomingRenewalCard;
