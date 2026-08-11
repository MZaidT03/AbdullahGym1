import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, StatusBar, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GymHeader from '../components/GymHeader';
import PaymentCard from '../components/PaymentCard';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const PaymentsScreen = () => {
  const handleManagePayment = () => {
    Alert.alert('Payment Method', 'Payment gateway settings can be configured in web portal.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <GymHeader title="Payments" variant="payments" />

        {/* Current Plan Overview Card */}
        <PaymentCard
          title="Pro Elite Plan"
          amount="$120"
          nextDate="Dec 31, 2024"
          isCurrent={true}
        />

        {/* Manage Payment Method Button */}
        <TouchableOpacity
          style={styles.manageBtn}
          onPress={handleManagePayment}
          activeOpacity={0.8}
        >
          <Ionicons name="card-outline" size={18} color={colors.primaryDark} style={{ marginRight: 8 }} />
          <Text style={styles.manageBtnText}>Manage Payment Method</Text>
        </TouchableOpacity>

        {/* Payment History Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment History</Text>
        </View>

        <PaymentCard
          title="Membership Fee"
          date="Dec 01, 2024"
          amount="$120"
          status="PAID"
        />

        <PaymentCard
          title="Membership Fee"
          date="Nov 01, 2024"
          amount="$120"
          status="PAID"
        />

        <PaymentCard
          title="Membership Fee"
          date="Oct 01, 2024"
          amount="$120"
          status="PAID"
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
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 14,
    height: 48,
    marginBottom: 24,
    ...theme.shadows.soft,
  },
  manageBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
});

export default PaymentsScreen;
