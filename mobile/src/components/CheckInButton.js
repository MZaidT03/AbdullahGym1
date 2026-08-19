import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDialog } from '../context/DialogContext';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const CheckInButton = ({ isCheckedIn = false, checkInTime = null, isDeactivated = false, onCheckInPress }) => {
  const { showDialog } = useDialog();

  const handlePress = async () => {
    if (isDeactivated) {
      showDialog({
        title: 'Account Deactivated ❌',
        message: 'Your monthly membership validity has ended. Please submit your renewal fee in the Payments tab to reactivate check-in access.',
        type: 'deactivated',
        confirmText: 'Got It',
      });
      return;
    }

    if (isCheckedIn) {
      showDialog({
        title: 'Already Checked In Today! 💪',
        message: `You have already checked in today${checkInTime ? ` at ${checkInTime}` : ''}. Have a great workout!`,
        type: 'info',
        confirmText: 'Awesome!',
      });
      return;
    }

    if (onCheckInPress) {
      const result = await onCheckInPress();
      if (result) {
        showDialog({
          title: 'Checked In Successfully! 🎉',
          message: `Welcome to Abdullah Gym 1! Checked in at ${result.time || 'now'}.`,
          type: 'success',
          confirmText: "Let's Workout! 🏋️",
        });
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Outer Glow Ring 3 */}
      <View style={[styles.outerRing3, isDeactivated && styles.deactivatedRing3]}>
        {/* Middle Glow Ring 2 */}
        <View style={[styles.outerRing2, isDeactivated && styles.deactivatedRing2]}>
          {/* Inner Glow Ring 1 */}
          <View style={[styles.outerRing1, isDeactivated && styles.deactivatedRing1]}>
            <TouchableOpacity
              style={[
                styles.centerCircle,
                isCheckedIn && styles.centerCircleChecked,
                isDeactivated && styles.centerCircleDeactivated,
              ]}
              activeOpacity={0.78}
              onPress={handlePress}
            >
              <View style={styles.iconCircle}>
                <Ionicons
                  name={isDeactivated ? 'lock-closed' : isCheckedIn ? 'checkmark-sharp' : 'fitness'}
                  size={32}
                  color={colors.white}
                />
              </View>
              <Text style={styles.buttonText}>
                {isDeactivated ? 'Deactivated' : isCheckedIn ? 'Checked In' : 'Tap to Check In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.statusPill}>
        <View style={[styles.statusDot, isCheckedIn ? styles.dotGreen : isDeactivated ? styles.dotRed : styles.dotAmber]} />
        <Text style={styles.subtext}>
          {isDeactivated
            ? 'Access disabled (Membership expired - Fee due)'
            : isCheckedIn
            ? `Checked in for today${checkInTime ? ` • ${checkInTime}` : ''}`
            : 'Ready for today’s session'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  outerRing3: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(22, 196, 91, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deactivatedRing3: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  outerRing2: {
    width: 172,
    height: 172,
    borderRadius: 86,
    backgroundColor: 'rgba(22, 196, 91, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deactivatedRing2: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  outerRing1: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(22, 196, 91, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deactivatedRing1: {
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
  },
  centerCircle: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    ...theme.shadows.glow,
  },
  centerCircleChecked: {
    backgroundColor: colors.primaryDark,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  centerCircleDeactivated: {
    backgroundColor: '#DC2626',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  iconCircle: {
    marginBottom: 2,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 12,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotGreen: {
    backgroundColor: '#22C55E',
  },
  dotAmber: {
    backgroundColor: '#F59E0B',
  },
  dotRed: {
    backgroundColor: '#EF4444',
  },
  subtext: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});

export default CheckInButton;
