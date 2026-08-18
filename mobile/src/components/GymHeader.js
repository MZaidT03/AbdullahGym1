import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const GymHeader = ({
  variant = 'home', // 'home' | 'attendance' | 'profile' | 'payments'
  title = 'Abdullah Gym 1',
  greeting = 'Good Morning,',
  userName = 'Member',
  userAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
  onNotificationPress,
  onEditPress,
}) => {
  if (variant === 'home') {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.textColumn}>
          <View style={styles.brandPill}>
            <View style={styles.liveGreenDot} />
            <Text style={styles.brandPillText}>ABDULLAH GYM 1</Text>
          </View>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.welcomeText}>{userName}</Text>
        </View>

        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={onNotificationPress}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
            <View style={styles.notifBadgeDot} />
          </TouchableOpacity>

          <View style={styles.avatarRing}>
            <Image
              source={{ uri: userAvatar }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'attendance') {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.textColumn}>
          <View style={styles.brandPill}>
            <Text style={styles.brandPillText}>ATTENDANCE PORTAL</Text>
          </View>
          <Text style={styles.pageTitle}>Workout Activity</Text>
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onNotificationPress}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.primaryDark} />
        </TouchableOpacity>
      </View>
    );
  }

  if (variant === 'profile') {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.textColumn}>
          <View style={styles.brandPill}>
            <Text style={styles.brandPillText}>MEMBER PORTAL</Text>
          </View>
          <Text style={styles.pageTitle}>My Profile</Text>
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onEditPress}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={20} color={colors.primaryDark} />
        </TouchableOpacity>
      </View>
    );
  }

  // Payments / Default
  return (
    <View style={styles.headerContainer}>
      <View style={styles.textColumn}>
        <View style={styles.brandPill}>
          <Text style={styles.brandPillText}>FINANCE & PASS</Text>
        </View>
        <Text style={styles.pageTitle}>Subscription & Billing</Text>
      </View>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onNotificationPress}
        activeOpacity={0.8}
      >
        <Ionicons name="receipt-outline" size={20} color={colors.primaryDark} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 2,
    marginBottom: 6,
  },
  textColumn: {
    flexDirection: 'column',
    flex: 1,
  },
  brandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  liveGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  brandPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  greetingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    ...theme.shadows.soft,
  },
  notifBadgeDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  avatarRing: {
    padding: 2,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    ...theme.shadows.soft,
  },
});

export default GymHeader;
