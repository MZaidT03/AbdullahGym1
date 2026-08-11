import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const GymHeader = ({
  variant = 'home', // 'home' | 'attendance' | 'profile' | 'payments'
  title = 'GymPro',
  greeting = 'Good Morning,',
  userName = 'Abdullah',
  userAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
  onNotificationPress,
  onEditPress,
}) => {
  if (variant === 'home') {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.textColumn}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.welcomeText}>Welcome, {userName}</Text>
        </View>
        <Image
          source={{ uri: userAvatar }}
          style={styles.avatarImage}
          resizeMode="cover"
        />
      </View>
    );
  }

  if (variant === 'attendance') {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.textColumn}>
          <Text style={styles.brandTitle}>GymPro</Text>
          <Text style={styles.subtitleText}>Welcome back, {userName}</Text>
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onNotificationPress}
          activeOpacity={0.8}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    );
  }

  if (variant === 'profile') {
    return (
      <View style={styles.headerContainer}>
        <Text style={styles.brandTitle}>GymPro</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onEditPress}
          activeOpacity={0.8}
        >
          <Ionicons name="pencil-outline" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    );
  }

  // Payments / Default
  return (
    <View style={styles.headerContainer}>
      <View style={styles.textColumn}>
        <Text style={styles.brandTitle}>{title}</Text>
        <Text style={styles.subtitleText}>Billing & Subscription</Text>
      </View>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onNotificationPress}
        activeOpacity={0.8}
      >
        <Ionicons name="card-outline" size={20} color={colors.textPrimary} />
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
    marginBottom: 8,
  },
  textColumn: {
    flexDirection: 'column',
  },
  greetingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: '#E5E7EB',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...theme.shadows.soft,
  },
});

export default GymHeader;
