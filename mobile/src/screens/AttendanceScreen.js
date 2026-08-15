import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import GymHeader from '../components/GymHeader';
import AttendanceSummary from '../components/AttendanceSummary';
import AttendanceCalendar from '../components/AttendanceCalendar';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const AttendanceScreen = () => {
  const { user, isCheckedIn } = useAuth();
  const { showDialog } = useDialog();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('THIS_MONTH'); // 'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME'
  const [currentViewMonth, setCurrentViewMonth] = useState(new Date());

  useEffect(() => {
    fetchAttendanceLogs();
  }, [user?.id, isCheckedIn, selectedFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAttendanceLogs();
    setRefreshing(false);
  };

  const fetchAttendanceLogs = async () => {
    setLoading(true);
    if (isSupabaseConfigured() && user?.id) {
      try {
        let query = supabase
          .from('attendance')
          .select('*')
          .eq('user_id', user.id)
          .order('check_in_time', { ascending: false });

        const now = new Date();
        if (selectedFilter === 'THIS_MONTH') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          query = query.gte('check_in_time', startOfMonth.toISOString());
        } else if (selectedFilter === 'LAST_MONTH') {
          const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          query = query
            .gte('check_in_time', startOfLastMonth.toISOString())
            .lte('check_in_time', endOfLastMonth.toISOString());
        }

        const { data, error } = await query;
        if (!error && data) {
          setLogs(data);
        } else {
          console.warn('Attendance query error:', error?.message);
        }
      } catch (err) {
        console.error('Error fetching attendance logs:', err);
      }
    } else {
      // Demo fallback logs
      const sampleLogs = [
        { id: '1', check_in_time: new Date().toISOString() },
        { id: '2', check_in_time: new Date(Date.now() - 86400000).toISOString() },
        { id: '3', check_in_time: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: '4', check_in_time: new Date(Date.now() - 86400000 * 4).toISOString() },
      ];
      setLogs(sampleLogs);
    }
    setLoading(false);
  };

  const handleNotificationPress = () => {
    showDialog({
      title: 'Attendance Notifications 🔔',
      message: 'You are all caught up! No missing attendance alerts.',
      type: 'info',
    });
  };

  // Process data for calendar & summary for the currently viewed month
  const viewYear = currentViewMonth.getFullYear();
  const viewMonth = currentViewMonth.getMonth();

  const presentDaysSet = new Set();
  logs.forEach((log) => {
    if (log.check_in_time) {
      const d = new Date(log.check_in_time);
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        presentDaysSet.add(d.getDate());
      }
    }
  });

  const presentDays = Array.from(presentDaysSet);
  const presentCount = presentDays.length;

  const now = new Date();
  const isViewingCurrentMonth = now.getFullYear() === viewYear && now.getMonth() === viewMonth;
  const daysInViewMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysElapsed = isViewingCurrentMonth ? now.getDate() : daysInViewMonth;

  const absentCount = Math.max(0, daysElapsed - presentCount);
  const attendancePercentage = daysElapsed > 0 ? Math.round((presentCount / daysElapsed) * 100) : 100;

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
        {/* Header */}
        <GymHeader
          variant="attendance"
          userName={user?.name || user?.fullName || 'Member'}
          onNotificationPress={handleNotificationPress}
        />

        {/* Filter Toolbar */}
        <View style={styles.filterRow}>
          {[
            { id: 'THIS_MONTH', label: 'This Month' },
            { id: 'LAST_MONTH', label: 'Last Month' },
            { id: 'ALL_TIME', label: 'All History' },
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.filterChip, selectedFilter === item.id && styles.filterChipActive]}
              onPress={() => setSelectedFilter(item.id)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === item.id && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 3 Metric Capsules Summary */}
        <AttendanceSummary
          percentage={attendancePercentage}
          presentCount={presentCount}
          absentCount={absentCount}
        />

        {/* Interactive Dynamic Monthly Calendar */}
        <AttendanceCalendar
          presentDays={presentDays}
          currentMonth={currentViewMonth}
          onMonthChange={(newMonth) => setCurrentViewMonth(newMonth)}
        />

        {/* Check-In History Ledger */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Check-In Logs</Text>
          <View style={styles.logCountBadge}>
            <Text style={styles.logCountText}>{logs.length} Recorded</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginVertical: 20 }} />
        ) : logs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Attendance Records</Text>
            <Text style={styles.emptySubtitle}>Check-in at the gym using the Home tab to start logging.</Text>
          </View>
        ) : (
          logs.map((log, index) => {
            const dt = log.check_in_time ? new Date(log.check_in_time) : new Date();
            const dateStr = dt.toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <View key={log.id || String(index)} style={styles.logCard}>
                <View style={styles.logLeft}>
                  <View style={styles.logIconBox}>
                    <Ionicons name="checkmark-sharp" size={16} color={colors.primaryDark} />
                  </View>
                  <View>
                    <Text style={styles.logDate}>{dateStr}</Text>
                    <Text style={styles.logTime}>Check-In at {timeStr}</Text>
                  </View>
                </View>

                <View style={styles.verifiedPill}>
                  <View style={styles.verifiedDot} />
                  <Text style={styles.verifiedText}>PRESENT</Text>
                </View>
              </View>
            );
          })
        )}
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
    paddingBottom: 95,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    ...theme.shadows.soft,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  logCountBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  logCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  logCard: {
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
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logDate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  logTime: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#22C55E',
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
});

export default AttendanceScreen;
