import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const CheckInButton = ({ isCheckedIn = false, onCheckInPress }) => {
  const handlePress = () => {
    if (onCheckInPress) {
      const result = onCheckInPress();
      if (result) {
        if (!isCheckedIn) {
          Alert.alert('Checked In Successfully! 🎉', `Welcome to GymPro! Checked in at ${result.time || 'now'}.`);
        } else {
          Alert.alert('Checked Out', 'You have checked out of the gym. Great workout!');
        }
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Outer Glow Ring 3 */}
      <View style={styles.outerRing3}>
        {/* Middle Glow Ring 2 */}
        <View style={styles.outerRing2}>
          {/* Inner Glow Ring 1 */}
          <View style={styles.outerRing1}>
            <TouchableOpacity
              style={[styles.centerCircle, isCheckedIn && styles.centerCircleChecked]}
              activeOpacity={0.75}
              onPress={handlePress}
            >
              <Ionicons
                name={isCheckedIn ? 'checkmark-circle' : 'hand-left'}
                size={34}
                color={colors.white}
              />
              <Text style={styles.buttonText}>
                {isCheckedIn ? 'Checked In' : 'Check In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Text style={styles.subtext}>
        {isCheckedIn
          ? 'You are checked in! Tap to check out when leaving.'
          : 'Tap to check-in when you arrive at the gym.'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  outerRing3: {
    width: 195,
    height: 195,
    borderRadius: 97.5,
    backgroundColor: 'rgba(22, 196, 91, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerRing2: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(22, 196, 91, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerRing1: {
    width: 145,
    height: 145,
    borderRadius: 72.5,
    backgroundColor: 'rgba(22, 196, 91, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.glow,
  },
  centerCircleChecked: {
    backgroundColor: colors.primaryDark,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
    marginTop: 4,
  },
  subtext: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 14,
    maxWidth: 240,
  },
});

export default CheckInButton;
