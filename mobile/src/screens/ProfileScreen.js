import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, StatusBar, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import GymHeader from '../components/GymHeader';
import QRCodeView from '../components/QRCodeView';
import SettingRow from '../components/SettingRow';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out of Abdullah Gym 1?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.getParent()?.replace('Login');
          },
        },
      ]
    );
  };

  const handleSettingPress = (title) => {
    Alert.alert(title, `${title} options selected.`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <GymHeader
          variant="profile"
          onEditPress={() => Alert.alert('Edit Profile', 'Edit profile modal opened.')}
        />

        {/* Member Profile Avatar & Info */}
        <View style={styles.profileSection}>
          <Image
            source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250' }}
            style={styles.avatar}
            resizeMode="cover"
          />
          <Text style={styles.memberName}>{user?.fullName || 'Alex Johnson'}</Text>
          <Text style={styles.memberEmail}>{user?.email || 'alex.johnson@example.com'}</Text>
        </View>

        {/* Membership Details Card */}
        <View style={styles.membershipCard}>
          <View style={styles.membershipHeader}>
            <View>
              <Text style={styles.membershipLabel}>MEMBERSHIP</Text>
              <Text style={styles.planTitle}>{user?.plan || 'Pro Elite Plan'}</Text>
            </View>
            <View style={styles.statusGroup}>
              <Text style={styles.statusLabel}>STATUS</Text>
              <Text style={styles.activeStatusText}>Active</Text>
            </View>
          </View>

          {/* QR Code Container Box */}
          <View style={styles.qrContainer}>
            <QRCodeView size={130} />
            <Text style={styles.qrIdText}>ID: {user?.memberId || 'GP-8472-991'}</Text>
          </View>

          {/* Card Footer */}
          <View style={styles.membershipFooter}>
            <Text style={styles.expiresText}>Expires: Dec 31, 2024</Text>
            <TouchableOpacity
              style={styles.renewBtn}
              onPress={() => navigation.navigate('Payments')}
              activeOpacity={0.8}
            >
              <Text style={styles.renewBtnText}>Renew</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings Section */}
        <Text style={styles.sectionHeader}>SETTINGS</Text>
        <View style={styles.settingsCard}>
          <SettingRow
            iconName="notifications-outline"
            label="Notifications"
            onPress={() => handleSettingPress('Notifications')}
          />
          <SettingRow
            iconName="shield-checkmark-outline"
            label="Privacy & Security"
            onPress={() => handleSettingPress('Privacy & Security')}
          />
          <SettingRow
            iconName="card-outline"
            label="Payment Methods"
            isLast={true}
            onPress={() => handleSettingPress('Payment Methods')}
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="exit-outline" size={20} color={colors.danger} style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 90,
  },
  profileSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.white,
    backgroundColor: '#E5E7EB',
    ...theme.shadows.medium,
  },
  memberName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 10,
  },
  memberEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  membershipCard: {
    backgroundColor: colors.cardBackgroundAlt,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 16,
    ...theme.shadows.soft,
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  membershipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: 2,
  },
  statusGroup: {
    alignItems: 'flex-end',
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  activeStatusText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: 2,
  },
  qrContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    ...theme.shadows.soft,
  },
  qrIdText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginTop: 14,
  },
  membershipFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expiresText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  renewBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  renewBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    overflow: 'hidden',
    ...theme.shadows.soft,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: 16,
    height: 52,
    marginBottom: 24,
    ...theme.shadows.soft,
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.danger,
  },
});

export default ProfileScreen;
