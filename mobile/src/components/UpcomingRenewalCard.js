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

  // Active Period (>10 days remaining & 0 overdue): Keep dashboard clean
  if (daysRemaining > 10 && overdueDays === 0 && !isDeactivated) {
    return null;
  }

  // Determine Banner Variant: 'yellow' (amber), 'red' (danger), 'deactivated' (critical red), or 'emerald'
  let variant = 'emerald';
  let title = 'Renewal Window Open 🔔';
  let description = `Your membership renewal is open (${daysRemaining} days remaining).`;
  let iconName = 'notifications-outline';

  if (isDeactivated) {
    variant = 'deactivated';
    title = 'Account Expired ❌';
    description = '7-day grace period exceeded. Please pay your fee to reactivate gym access.';
    iconName = 'close-circle-outline';
  } else if (overdueDays >= 4 && overdueDays <= 7) {
    variant = 'red';
    title = 'Grace Period Ending 🚨';
    description = `Day ${overdueDays} of 7 grace period. Account will be deactivated after day 7!`;
    iconName = 'warning-outline';
  } else if (overdueDays >= 1 && overdueDays <= 3) {
    variant = 'yellow';
    title = '7-Day Grace Period Active ⚠️';
    description = `Month completed (Day ${overdueDays} of 7). Please submit your monthly renewal fee.`;
    iconName = 'alert-circle-outline';
  } else if (daysRemaining <= 3 && daysRemaining >= 0) {
    variant = 'yellow';
    title = 'Expiring Soon ⏳';
    description = `Your membership expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Renew now for uninterrupted access.`;
    iconName = 'time-outline';
  } else if (daysRemaining <= 10) {
    variant = 'emerald';
    title = 'Renewal Window Open 🔔';
    description = `10-day renewal window is open (${daysRemaining} days left). Submit fee proof to renew for next cycle.`;
    iconName = 'notifications-outline';
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
        return styles.emeraldCard;
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
        return styles.emeraldTitle;
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
        return colors.primaryDark;
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
              {isDeactivated ? 'Reactivate' : 'Pay / Renew'}
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
  emeraldCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
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
    fontWeight: '800',
  },
  emeraldTitle: {
    color: colors.primaryDark,
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
    fontSize: 12,
    color: '#374151',
    lineHeight: 17,
    fontWeight: '500',
  },
});

export default UpcomingRenewalCard;
