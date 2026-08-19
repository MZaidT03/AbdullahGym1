import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import GymHeader from '../components/GymHeader';
import NotificationService from '../services/NotificationService';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const ProfileScreen = ({ navigation }) => {
  const { user, updateUserProfile, refreshProfile, logout } = useAuth();
  const { showDialog, showConfirm } = useDialog();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [editAvatar, setEditAvatar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [totalCheckIns, setTotalCheckIns] = useState(14);

  useEffect(() => {
    fetchTotalCheckIns();
    NotificationService.arePushNotificationsEnabled().then(setPushNotifications);
  }, [user?.id]);

  const fetchTotalCheckIns = async () => {
    if (isSupabaseConfigured() && user?.id) {
      try {
        const { count, error } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (!error && typeof count === 'number') {
          setTotalCheckIns(count);
        }
      } catch (e) {
        console.warn('Notice fetching profile attendance count:', e);
      }
    }
  };

  const openEditModal = () => {
    setEditFullName(user?.fullName || user?.name || '');
    setEditGender(user?.gender || 'Male');
    setEditAvatar(user?.avatar || null);
    setEditModalVisible(true);
  };

  const handlePickAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showDialog({
          title: 'Permission Required',
          message: 'You need to allow media access to change your profile picture.',
          type: 'warning',
        });
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        const asset = pickerResult.assets[0];
        const imageSource = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setEditAvatar(imageSource);
      }
    } catch (err) {
      console.error('Error picking avatar:', err);
    }
  };

  const handleSaveProfile = async () => {
    if (!editFullName.trim()) {
      showDialog({
        title: 'Validation Error',
        message: 'Full name cannot be empty.',
        type: 'danger',
      });
      return;
    }

    setSaving(true);
    const result = await updateUserProfile({
      fullName: editFullName.trim(),
      gender: editGender,
      avatar: editAvatar,
    });
    setSaving(false);

    if (result.success) {
      showDialog({
        title: 'Profile Updated 🎉',
        message: 'Your profile details have been updated successfully.',
        type: 'success',
      });
      setEditModalVisible(false);
      refreshProfile();
    } else {
      showDialog({
        title: 'Update Error',
        message: result.message || 'Failed to update profile.',
        type: 'danger',
      });
    }
  };

  const handleLogout = async () => {
    showConfirm({
      title: 'Logout',
      message: 'Are you sure you want to log out of Abdullah Gym 1?',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      confirmStyle: 'danger',
      type: 'confirm',
      onConfirm: async () => {
        await logout();
        navigation.getParent()?.replace('Login');
      },
    });
  };

  const daysRem = user?.daysRemaining !== undefined ? user.daysRemaining : 30;
  const overdueDays = user?.overdueDays !== undefined ? user.overdueDays : 0;
  const isActive = user?.status === 'Active' && overdueDays <= 7;
  const statusColor = isActive ? colors.primaryDark : colors.danger;
  const statusBg = isActive ? '#DCFCE7' : '#FEE2E2';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <GymHeader variant="profile" onEditPress={openEditModal} />

        {/* Executive Profile Identity Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileCardTop}>
            <TouchableOpacity
              onPress={openEditModal}
              activeOpacity={0.85}
              style={styles.avatarContainer}
            >
              <Image
                source={{
                  uri:
                    user?.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
                }}
                style={styles.avatar}
                resizeMode="cover"
              />
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={13} color={colors.white} />
              </View>
            </TouchableOpacity>

            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {user?.fullName || user?.name || 'Abdullah Member'}
                </Text>
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              </View>
              <Text style={styles.memberEmail} numberOfLines={1}>
                {user?.email || 'member@example.com'}
              </Text>

              <View style={styles.pillRow}>
                <View style={styles.idBadge}>
                  <Ionicons name="finger-print-outline" size={11} color={colors.textSecondary} />
                  <Text style={styles.idBadgeText}>ID: {user?.memberId || 'GP-8472'}</Text>
                </View>

                <View style={styles.genderPill}>
                  <Ionicons
                    name={user?.gender === 'Female' ? 'female' : 'male'}
                    size={11}
                    color={colors.primaryDark}
                  />
                  <Text style={styles.genderPillText}>{user?.gender || 'Male'}</Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={openEditModal}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={15} color={colors.primaryDark} />
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Digital Membership Pass (Luxury Card) */}
        <View style={styles.membershipCard}>
          <View style={styles.membershipGlowOverlay} />

          <View style={styles.membershipHeader}>
            <View>
              <Text style={styles.passSubtitle}>OFFICIAL GYM PASS</Text>
              <Text style={styles.planTitle}>{user?.plan || 'Pro Membership'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {user?.status || 'Active'}
              </Text>
            </View>
          </View>

          <View style={styles.passDivider} />

          <View style={styles.membershipFooter}>
            <View>
              <Text style={styles.validityLabel}>MEMBERSHIP VALIDITY</Text>
              <Text style={styles.validityValue}>
                <Text style={styles.validityNumber}>{daysRem}</Text> Days Remaining
              </Text>
            </View>
            <TouchableOpacity
              style={styles.renewBtn}
              onPress={() => navigation.navigate('Payments')}
              activeOpacity={0.8}
            >
              <Text style={styles.renewBtnText}>Renew Plan</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Member Overview Capsules */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCapsule}>
            <View style={[styles.metricIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="barbell-outline" size={18} color={colors.primaryDark} />
            </View>
            <Text style={styles.metricValue}>{totalCheckIns}</Text>
            <Text style={styles.metricLabel}>Sessions</Text>
          </View>

          <View style={styles.metricCapsule}>
            <View style={[styles.metricIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#2563EB" />
            </View>
            <Text style={styles.metricValue}>{user?.status || 'Active'}</Text>
            <Text style={styles.metricLabel}>Account</Text>
          </View>

          <View style={styles.metricCapsule}>
            <View style={[styles.metricIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="calendar-outline" size={18} color="#D97706" />
            </View>
            <Text style={styles.metricValue}>{daysRem}d</Text>
            <Text style={styles.metricLabel}>Left</Text>
          </View>
        </View>

        {/* Settings & Preferences (iOS Grouped Style) */}
        <Text style={styles.sectionHeader}>ACCOUNT PREFERENCES</Text>
        <View style={styles.settingsGroup}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={openEditModal}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBox, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="person-outline" size={18} color={colors.textPrimary} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Personal Information</Text>
                <Text style={styles.settingSub}>Name, Gender & Avatar</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.itemDivider} />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBox, { backgroundColor: 'rgba(22, 196, 91, 0.12)' }]}>
                <Ionicons name="notifications-outline" size={18} color={colors.primaryDark} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingSub}>Check-in alerts & reminders</Text>
              </View>
            </View>
            <Switch
              trackColor={{ false: '#E2E8F0', true: colors.primary }}
              thumbColor={pushNotifications ? colors.white : '#94A3B8'}
              ios_backgroundColor="#E2E8F0"
              onValueChange={async (val) => {
                setPushNotifications(val);
                await NotificationService.setPushNotificationsEnabled(val);
                showDialog({
                  title: val ? 'Notifications Enabled 🔔' : 'Notifications Disabled 🔕',
                  message: val
                    ? 'You will now receive fee deadline alerts, 10-day renewal notices & check-in updates.'
                    : 'Push notifications have been turned off.',
                  type: val ? 'success' : 'info',
                });
              }}
              value={pushNotifications}
            />
          </View>
        </View>

        {/* App Info Group */}
        <Text style={styles.sectionHeader}>GYM & APP DETAILS</Text>
        <View style={styles.settingsGroup}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBox, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="location-outline" size={18} color={colors.textPrimary} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Branch</Text>
                <Text style={styles.settingSub}>Abdullah Gym 1, Main Branch</Text>
              </View>
            </View>
          </View>

          <View style={styles.itemDivider} />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBox, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.textPrimary} />
              </View>
              <View>
                <Text style={styles.settingTitle}>App Version</Text>
                <Text style={styles.settingSub}>v2.4.0 (Latest Release)</Text>
              </View>
            </View>
          </View>

          <View style={styles.itemDivider} />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="code-slash-outline" size={18} color={colors.primaryDark} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Technology Partner</Text>
                <Text style={styles.settingSub}>Powered By CodeInn' Tech | contact@codeinntech.com</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Log Out of Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile Details</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingVertical: 14, paddingBottom: 24 }}
            >
              {/* Photo Picker */}
              <View style={styles.avatarEditWrapper}>
                <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.8} style={styles.avatarPickBtn}>
                  <Image
                    source={{
                      uri:
                        editAvatar ||
                        user?.avatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
                    }}
                    style={styles.modalAvatar}
                  />
                  <View style={styles.modalCameraBadge}>
                    <Ionicons name="camera" size={16} color={colors.white} />
                  </View>
                </TouchableOpacity>
                <Text style={styles.changePhotoText}>Tap to change photo</Text>
              </View>

              {/* Full Name */}
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={editFullName}
                onChangeText={setEditFullName}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textMuted}
              />

              {/* Gender */}
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {['Male', 'Female', 'Other'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderChip, editGender === g && styles.genderChipActive]}
                    onPress={() => setEditGender(g)}
                  >
                    <Text
                      style={[
                        styles.genderChipText,
                        editGender === g && styles.genderChipTextActive,
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Email (Read only) */}
              <Text style={styles.inputLabel}>Registered Email (Locked)</Text>
              <TextInput
                style={[styles.textInput, styles.disabledInput]}
                value={user?.email || 'member@example.com'}
                editable={false}
              />

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveProfile}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-sharp" size={18} color={colors.white} style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 4 : 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 95,
  },
  profileCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    ...theme.shadows.soft,
  },
  profileCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primaryDark,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  memberEmail: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 6,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  idBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  genderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  genderPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    paddingVertical: 9,
    marginTop: 14,
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  membershipCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
    ...theme.shadows.medium,
  },
  membershipGlowOverlay: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(22, 196, 91, 0.15)',
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  passSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
    marginTop: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  passDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 14,
  },
  membershipFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  validityLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  validityValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
    marginTop: 2,
  },
  validityNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
  },
  renewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  renewBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCapsule: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...theme.shadows.soft,
  },
  metricIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingsGroup: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
    ...theme.shadows.soft,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  settingSub: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 64,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 16,
    height: 52,
    marginBottom: 20,
    marginTop: 4,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  avatarEditWrapper: {
    alignItems: 'center',
    marginVertical: 10,
  },
  avatarPickBtn: {
    position: 'relative',
  },
  modalAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E5E7EB',
  },
  modalCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  disabledInput: {
    backgroundColor: '#F1F5F9',
    color: colors.textMuted,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  genderChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  genderChipTextActive: {
    color: colors.white,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 50,
    marginTop: 20,
    marginBottom: 20,
    ...theme.shadows.medium,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
});

export default ProfileScreen;
