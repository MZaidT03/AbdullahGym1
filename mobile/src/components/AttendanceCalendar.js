import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const AttendanceCalendar = ({
  presentDays = [1, 2, 4, 5, 7, 8, 11, 12, 14, 15, 16, 19, 21, 22, 23, 24],
  absentDays = [9, 18],
  initialSelectedDay = 24,
}) => {
  const [selectedDay, setSelectedDay] = useState(initialSelectedDay);

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // October 2024 grid data (starts on Tuesday Oct 1)
  const calendarGrid = [
    { day: 29, isCurrentMonth: false },
    { day: 30, isCurrentMonth: false },
    { day: 1, isCurrentMonth: true },
    { day: 2, isCurrentMonth: true },
    { day: 3, isCurrentMonth: true },
    { day: 4, isCurrentMonth: true },
    { day: 5, isCurrentMonth: true },

    { day: 6, isCurrentMonth: true },
    { day: 7, isCurrentMonth: true },
    { day: 8, isCurrentMonth: true },
    { day: 9, isCurrentMonth: true },
    { day: 10, isCurrentMonth: true },
    { day: 11, isCurrentMonth: true },
    { day: 12, isCurrentMonth: true },

    { day: 13, isCurrentMonth: true },
    { day: 14, isCurrentMonth: true },
    { day: 15, isCurrentMonth: true },
    { day: 16, isCurrentMonth: true },
    { day: 17, isCurrentMonth: true },
    { day: 18, isCurrentMonth: true },
    { day: 19, isCurrentMonth: true },

    { day: 20, isCurrentMonth: true },
    { day: 21, isCurrentMonth: true },
    { day: 22, isCurrentMonth: true },
    { day: 23, isCurrentMonth: true },
    { day: 24, isCurrentMonth: true },
    { day: 25, isCurrentMonth: true },
    { day: 26, isCurrentMonth: true },

    { day: 27, isCurrentMonth: true },
    { day: 28, isCurrentMonth: true },
    { day: 29, isCurrentMonth: true },
    { day: 30, isCurrentMonth: true },
    { day: 31, isCurrentMonth: true },
    { day: 1, isCurrentMonth: false },
    { day: 2, isCurrentMonth: false },
  ];

  return (
    <View style={styles.card}>
      {/* Weekday Labels */}
      <View style={styles.weekHeader}>
        {daysOfWeek.map((day, idx) => (
          <Text key={idx} style={styles.weekDayText}>
            {day}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.grid}>
        {calendarGrid.map((item, index) => {
          const isPresent = item.isCurrentMonth && presentDays.includes(item.day);
          const isAbsent = item.isCurrentMonth && absentDays.includes(item.day);
          const isSelected = item.isCurrentMonth && item.day === selectedDay;

          return (
            <TouchableOpacity
              key={index}
              disabled={!item.isCurrentMonth}
              style={[
                styles.dayCell,
                isSelected && styles.selectedCell,
              ]}
              onPress={() => setSelectedDay(item.day)}
            >
              <Text
                style={[
                  styles.dayText,
                  !item.isCurrentMonth && styles.otherMonthText,
                  isPresent && styles.presentText,
                  isAbsent && styles.absentText,
                  isSelected && styles.selectedText,
                ]}
              >
                {item.day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
          <Text style={styles.legendText}>Absent</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    ...theme.shadows.soft,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  selectedCell: {
    backgroundColor: colors.primary,
    ...theme.shadows.glow,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  otherMonthText: {
    color: '#D1D5DB',
  },
  presentText: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  absentText: {
    color: colors.danger,
    fontWeight: '800',
  },
  selectedText: {
    color: colors.white,
    fontWeight: '800',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

export default AttendanceCalendar;
