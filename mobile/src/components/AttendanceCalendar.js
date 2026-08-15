import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const AttendanceCalendar = ({
  presentDays = [],
  absentDays = [],
  currentMonth = new Date(),
  onMonthChange,
  onDayPress,
}) => {
  const [activeDate, setActiveDate] = useState(new Date(currentMonth));
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const year = activeDate.getFullYear();
  const month = activeDate.getMonth();

  // Generate calendar days for current view month
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const grid = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    grid.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, daysInPrevMonth - i),
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    grid.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i),
    });
  }

  // Next month leading days
  const remainingCells = 35 - grid.length > 0 ? 35 - grid.length : (42 - grid.length > 0 ? 42 - grid.length : 0);
  for (let i = 1; i <= remainingCells; i++) {
    grid.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i),
    });
  }

  const today = new Date();
  const isActualCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const handlePrevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    setActiveDate(prev);
    if (onMonthChange) onMonthChange(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(year, month + 1, 1);
    setActiveDate(next);
    if (onMonthChange) onMonthChange(next);
  };

  const handleDaySelect = (item) => {
    if (item.isCurrentMonth) {
      setSelectedDay(item.day);
      if (onDayPress) onDayPress(item.day);
    }
  };

  return (
    <View style={styles.card}>
      {/* Month Navigator Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.navBtn} onPress={handlePrevMonth} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.monthTitleBox}>
          <Text style={styles.monthTitle}>
            {monthNames[month]} {year}
          </Text>
        </View>

        <TouchableOpacity style={styles.navBtn} onPress={handleNextMonth} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Weekday Labels Header */}
      <View style={styles.weekHeader}>
        {daysOfWeek.map((day, idx) => (
          <Text key={idx} style={styles.weekDayText}>
            {day}
          </Text>
        ))}
      </View>

      {/* Days Matrix Grid */}
      <View style={styles.grid}>
        {grid.map((item, index) => {
          const isPresent = item.isCurrentMonth && presentDays.includes(item.day);
          const isToday = isActualCurrentMonth && item.day === today.getDate() && item.isCurrentMonth;
          const isSelected = item.isCurrentMonth && item.day === selectedDay;

          return (
            <TouchableOpacity
              key={index}
              disabled={!item.isCurrentMonth}
              style={[
                styles.dayCell,
                isPresent && styles.presentCell,
                isToday && !isPresent && styles.todayCell,
                isSelected && !isPresent && styles.selectedCell,
              ]}
              onPress={() => handleDaySelect(item)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.dayText,
                  !item.isCurrentMonth && styles.otherMonthText,
                  isPresent && styles.presentText,
                  isToday && !isPresent && styles.todayText,
                  isSelected && !isPresent && styles.selectedText,
                ]}
              >
                {item.day}
              </Text>
              {isPresent && (
                <View style={styles.checkDot}>
                  <Ionicons name="checkmark" size={9} color={colors.white} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend Footer */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Workout Done</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendRing, { borderColor: colors.primary }]} />
          <Text style={styles.legendText}>Today</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E2E8F0' }]} />
          <Text style={styles.legendText}>Rest Day</Text>
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
    marginBottom: 16,
    ...theme.shadows.soft,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  monthTitleBox: {
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weekDayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 3,
    position: 'relative',
  },
  presentCell: {
    backgroundColor: colors.primary,
    ...theme.shadows.soft,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(22, 196, 91, 0.1)',
  },
  selectedCell: {
    backgroundColor: '#F1F5F9',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  otherMonthText: {
    color: '#CBD5E1',
    fontWeight: '500',
  },
  presentText: {
    color: colors.white,
    fontWeight: '900',
  },
  todayText: {
    color: colors.primaryDark,
    fontWeight: '900',
  },
  selectedText: {
    color: colors.textPrimary,
  },
  checkDot: {
    position: 'absolute',
    bottom: 2,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendRing: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

export default AttendanceCalendar;
