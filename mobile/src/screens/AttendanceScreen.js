import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, StatusBar, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import GymHeader from '../components/GymHeader';
import AttendanceSummary from '../components/AttendanceSummary';
import AttendanceCalendar from '../components/AttendanceCalendar';
import RecentLogCard from '../components/RecentLogCard';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const AttendanceScreen = () => {
  const { user } = useAuth();

  const handleNotificationPress = () => {
    Alert.alert('Notifications', 'You have no new attendance alerts.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <GymHeader
          variant="attendance"
          userName={user?.name || 'Sarah'}
          onNotificationPress={handleNotificationPress}
        />

        {/* Section Header: Attendance + Month Selector */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Attendance</Text>
          <View style={styles.monthBadge}>
            <Text style={styles.monthBadgeText}>OCTOBER 2024</Text>
            <Ionicons name="calendar-outline" size={14} color={colors.primaryDark} style={{ marginLeft: 4 }} />
          </View>
        </View>

        {/* Attendance Summary (85% + Present/Absent) */}
        <AttendanceSummary
          percentage={85}
          presentCount={17}
          absentCount={3}
        />

        {/* Custom Attendance Calendar */}
        <AttendanceCalendar
          presentDays={[1, 2, 4, 5, 7, 8, 11, 12, 14, 15, 16, 19, 21, 22, 23, 24]}
          absentDays={[9, 18]}
          initialSelectedDay={24}
        />

        {/* Recent Logs Section */}
        <View style={styles.recentLogsHeader}>
          <Text style={styles.sectionTitle}>Recent Logs</Text>
        </View>

        {/* Log Item 1 */}
        <RecentLogCard
          title="Morning Session"
          timestamp="Oct 23, 07:15 AM"
          status="LOGGED"
          iconName="barbell-outline"
        />

        {/* Log Item 2 */}
        <RecentLogCard
          title="Cardio Class"
          timestamp="Oct 21, 06:00 PM"
          status="LOGGED"
          iconName="fitness-outline"
        />
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  recentLogsHeader: {
    marginBottom: 12,
    marginTop: 4,
  },
});

export default AttendanceScreen;
