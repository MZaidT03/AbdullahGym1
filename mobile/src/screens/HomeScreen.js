import React from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, StatusBar, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import GymHeader from '../components/GymHeader';
import MembershipCard from '../components/MembershipCard';
import UpcomingRenewalCard from '../components/UpcomingRenewalCard';
import CheckInButton from '../components/CheckInButton';
import CapacityCard from '../components/CapacityCard';
import colors from '../constants/colors';

export const HomeScreen = ({ navigation }) => {
  const { user, isCheckedIn, checkInTime, toggleCheckIn } = useAuth();

  const handleRenew = () => {
    Alert.alert('Renew Membership', 'Navigate to Payments tab to renew your membership.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Go to Payments', onPress: () => navigation.navigate('Payments') },
    ]);
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
          variant="home"
          greeting="Good Morning,"
          userName={user?.name || 'Abdullah'}
          userAvatar={user?.avatar}
        />

        {/* Membership Summary Card */}
        <MembershipCard
          planName={user?.plan || 'Pro Membership'}
          memberId={`ID: ${user?.memberId || '9876-5432'}`}
          daysRemaining={user?.daysRemaining || 14}
          isCheckedIn={isCheckedIn}
          checkInTime={checkInTime}
        />

        {/* Upcoming Renewal Alert Card */}
        <UpcomingRenewalCard
          daysRemaining={user?.daysRemaining || 14}
          onRenewPress={handleRenew}
        />

        {/* Central Concentric Circle Check-In Button */}
        <CheckInButton
          isCheckedIn={isCheckedIn}
          onCheckInPress={toggleCheckIn}
        />

        {/* Current Capacity Progress Card */}
        <CapacityCard
          percentage={70}
          statusText="Moderately Busy"
          barColor={colors.warning}
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
    paddingBottom: 90, // Leave room for custom bottom tab bar
  },
});

export default HomeScreen;
