import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import GymHeader from '../components/GymHeader';
import MembershipCard from '../components/MembershipCard';
import UpcomingRenewalCard from '../components/UpcomingRenewalCard';
import CheckInButton from '../components/CheckInButton';
import NotificationModal from '../components/NotificationModal';
import NotificationService from '../services/NotificationService';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const HomeScreen = ({ navigation }) => {
  const { user, isCheckedIn, checkInTime, toggleCheckIn, refreshProfile } = useAuth();
  const { showConfirm } = useDialog();
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifModalVisible, setNotifModalVisible] = useState(false);

  const [attendanceStats, setAttendanceStats] = useState({
    checkInCount: 0,
    streakDays: 0,
    activeWeekDays: new Set(),
  });

  useEffect(() => {
    fetchDashboardStats();
    fetchNotifications();
  }, [user?.id, isCheckedIn]);

  const fetchNotifications = async () => {
    try {
      if (user) {
        await NotificationService.evaluateFeeDeadlineNotification(user);
      }
      const list = await NotificationService.getNotifications(user?.id);
      setNotifications(list);
    } catch (e) {
      console.warn('Error fetching notifications:', e);
    }
  };

  const fetchDashboardStats = async () => {
    if (isSupabaseConfigured() && user?.id) {
      try {
        const { data, error } = await supabase
          .from('attendance')
          .select('check_in_time')
          .eq('user_id', user.id)
          .order('check_in_time', { ascending: false });

        if (!error && data) {
          calculateStats(data);
          return;
        }
      } catch (err) {
        console.warn('Notice fetching dashboard stats:', err);
      }
    }
    calculateStats([]);
  };

  const calculateStats = (logs) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let monthlyCount = 0;
    const checkInDatesSet = new Set();
    const weekDaysSet = new Set();

    // Calculate start of current week (Monday)
    const startOfWeek = new Date(now);
    const currentDayIndex = (now.getDay() + 6) % 7; // Monday = 0
    startOfWeek.setDate(now.getDate() - currentDayIndex);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    logs.forEach((log) => {
      if (log.check_in_time) {
        const d = new Date(log.check_in_time);
        const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        checkInDatesSet.add(dateKey);

        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          monthlyCount++;
        }

        if (d >= startOfWeek && d < endOfWeek) {
          const dayIdx = (d.getDay() + 6) % 7;
          weekDaysSet.add(dayIdx);
        }
      }
    });

    if (isCheckedIn) {
      const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      checkInDatesSet.add(todayKey);
      weekDaysSet.add(currentDayIndex);
      if (logs.length === 0) monthlyCount = Math.max(1, monthlyCount);
    }

    // Calculate streak
    let streak = 0;
    let tempDate = new Date(now);
    for (let i = 0; i < 30; i++) {
      const key = `${tempDate.getFullYear()}-${tempDate.getMonth()}-${tempDate.getDate()}`;
      if (checkInDatesSet.has(key)) {
        streak++;
        tempDate.setDate(tempDate.getDate() - 1);
      } else if (i === 0) {
        tempDate.setDate(tempDate.getDate() - 1);
      } else {
        break;
      }
    }

    setAttendanceStats({
      checkInCount: monthlyCount,
      streakDays: streak,
      activeWeekDays: weekDaysSet,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (refreshProfile) await refreshProfile();
      await fetchDashboardStats();
    } catch (e) {
      console.warn('Home refresh notice:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRenew = () => {
    showConfirm({
      title: 'Renew Membership 💳',
      message: 'Navigate to Payments tab to upload transfer proof or complete your renewal payment.',
      confirmText: 'Go to Payments',
      cancelText: 'Cancel',
      type: 'info',
      onConfirm: () => navigation.navigate('Payments'),
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  const daysRem = user?.daysRemaining !== undefined ? user.daysRemaining : 30;
  const overdueDays = user?.overdueDays !== undefined ? user.overdueDays : 0;
  const isDeactivated =
    user?.status === 'Suspended' ||
    user?.status === 'Inactive' ||
    user?.status === 'Deactivated' ||
    user?.status === 'Expired' ||
    daysRem <= 0;

  // 7-Day Workout Tracker Data
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIndex = (new Date().getDay() + 6) % 7; // Monday = 0
  const activeCountThisWeek = attendanceStats.activeWeekDays.size;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Top Header */}
        <GymHeader
          variant="home"
          greeting={getGreeting()}
          userName={user?.name || user?.fullName || 'Abdullah'}
          userAvatar={user?.avatar}
          onNotificationPress={() => setNotifModalVisible(true)}
        />

        {/* Membership Summary Card (Plan Description Section) */}
        <MembershipCard
          planName={user?.plan || 'Pro Membership'}
          memberId={`ID: ${user?.memberId || '9876-5432'}`}
          daysRemaining={daysRem}
          isCheckedIn={isCheckedIn}
          checkInTime={checkInTime}
        />

        {/* Active Add-Ons (e.g. Cardio Access 30-Day Independent Pass) */}
        {user?.activeAddons && user.activeAddons.length > 0 ? (
          <View style={styles.addonsContainer}>
            {user.activeAddons.map((addon) => (
              <View key={addon.id} style={styles.addonCard}>
                <View style={styles.addonIconBox}>
                  <Text style={styles.addonIconText}>{addon.icon || '🏃'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.addonTitleRow}>
                    <Text style={styles.addonName}>{addon.name}</Text>
                    <View
                      style={[
                        styles.addonStatusBadge,
                        addon.daysRemaining > 0 ? styles.addonActiveBadge : styles.addonExpiredBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.addonStatusText,
                          addon.daysRemaining > 0 ? styles.addonActiveText : styles.addonExpiredText,
                        ]}
                      >
                        {addon.daysRemaining > 0 ? `${addon.daysRemaining}d Left` : 'Expired'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.addonSub}>
                    Independent Pass • PKR {Number(addon.price).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Upcoming Renewal Alert Card (if expiring or overdue) */}
        <UpcomingRenewalCard
          daysRemaining={daysRem}
          overdueDays={overdueDays}
          status={user?.status}
          onRenewPress={handleRenew}
        />

        {/* Central Concentric Circle Check-In Button (Placed directly below plan section) */}
        <CheckInButton
          isCheckedIn={isCheckedIn}
          checkInTime={checkInTime}
          isDeactivated={isDeactivated}
          onCheckInPress={toggleCheckIn}
        />

        {/* Workout Activity & Membership Stats (3 Columns) */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="barbell" size={18} color={colors.primaryDark} />
            </View>
            <Text style={styles.statNumber}>{attendanceStats.checkInCount}</Text>
            <Text style={styles.statLabel}>THIS MONTH</Text>
            <Text style={styles.statSub}>Check-Ins</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="flame" size={18} color="#D97706" />
            </View>
            <Text style={styles.statNumber}>{attendanceStats.streakDays}d</Text>
            <Text style={styles.statLabel}>STREAK 🔥</Text>
            <Text style={styles.statSub}>Consecutive</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="shield-checkmark" size={18} color="#2563EB" />
            </View>
            <Text style={styles.statNumber}>{daysRem}d</Text>
            <Text style={styles.statLabel}>VALIDITY</Text>
            <Text style={styles.statSub}>Remaining</Text>
          </View>
        </View>

        {/* Weekly Workout Tracker Widget */}
        <View style={styles.trackerCard}>
          <View style={styles.trackerHeader}>
            <View>
              <Text style={styles.trackerTitle}>WEEKLY ACTIVITY</Text>
              <Text style={styles.trackerSubtitle}>
                {activeCountThisWeek} of 7 days active this week
              </Text>
            </View>
            <View style={styles.trackerBadge}>
              <Ionicons name="trophy-outline" size={13} color={colors.primaryDark} />
              <Text style={styles.trackerBadgeText}>
                {isCheckedIn ? 'Goal on track' : 'Show up today'}
              </Text>
            </View>
          </View>

          <View style={styles.weekDaysContainer}>
            <View style={styles.trackConnectorLine} />
            <View style={styles.weekDaysRow}>
              {daysOfWeek.map((day, idx) => {
                const isToday = idx === todayIndex;
                const isDone = attendanceStats.activeWeekDays.has(idx);
                return (
                  <View key={idx} style={styles.dayCol}>
                    <View
                      style={[
                        styles.dayBubble,
                        isDone && styles.dayBubbleDone,
                        isToday && !isDone && styles.dayBubbleToday,
                      ]}
                    >
                      {isDone ? (
                        <Ionicons name="checkmark-sharp" size={14} color={colors.white} />
                      ) : (
                        <Text style={[styles.dayLetter, isToday && styles.dayLetterToday]}>
                          {day}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                      {dayNames[idx]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Motivational Banner Card */}
        <View style={styles.quoteCard}>
          <View style={styles.quoteHeader}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text style={styles.quoteTag}>DAILY MOTIVATION</Text>
          </View>
          <Text style={styles.quoteText}>
            "Consistency is what transforms average into excellence. Show up today!"
          </Text>
          <Text style={styles.quoteAuthor}>— ABDULLAH GYM 1</Text>
        </View>
      </ScrollView>

      {/* Notification Center Modal */}
      <NotificationModal
        visible={notifModalVisible}
        onClose={() => setNotifModalVisible(false)}
        notifications={notifications}
        onPayPress={() => navigation.navigate('Payments')}
        onClearAll={async () => {
          await NotificationService.clearAll();
          setNotifications([]);
        }}
      />
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
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...theme.shadows.soft,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.6,
    marginTop: 3,
  },
  statSub: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 1,
  },
  trackerCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    ...theme.shadows.soft,
  },
  trackerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  trackerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  trackerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  trackerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  trackerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  weekDaysContainer: {
    position: 'relative',
    paddingTop: 4,
  },
  trackConnectorLine: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: '#F1F5F9',
    zIndex: 0,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  dayCol: {
    alignItems: 'center',
    gap: 5,
  },
  dayBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  dayBubbleDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayBubbleToday: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(22, 196, 91, 0.12)',
  },
  dayLetter: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  dayLetterToday: {
    color: colors.primaryDark,
    fontWeight: '900',
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  dayLabelToday: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  quoteCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  quoteTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.8,
  },
  quoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 19,
  },
  quoteAuthor: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    marginTop: 8,
    letterSpacing: 0.8,
  },
  addonsContainer: {
    marginVertical: 4,
    gap: 8,
  },
  addonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  addonIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addonIconText: {
    fontSize: 20,
  },
  addonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  addonName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addonStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  addonActiveBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  addonExpiredBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  addonStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  addonActiveText: {
    color: colors.primaryDark,
  },
  addonExpiredText: {
    color: '#DC2626',
  },
  addonSub: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
});

export default HomeScreen;
