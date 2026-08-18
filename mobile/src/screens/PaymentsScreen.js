import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Clipboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth, resolvePlanFee } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import GymHeader from '../components/GymHeader';
import PaymentCard from '../components/PaymentCard';
import NotificationService from '../services/NotificationService';
import colors from '../constants/colors';
import theme from '../constants/theme';

const decodeBase64ToArrayBuffer = (base64) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let bufferLength = base64.length * 0.75;
  if (base64[base64.length - 1] === '=') bufferLength--;
  if (base64[base64.length - 2] === '=') bufferLength--;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);

  let p = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const encoded1 = chars.indexOf(base64[i]);
    const encoded2 = chars.indexOf(base64[i + 1]);
    const encoded3 = chars.indexOf(base64[i + 2]);
    const encoded4 = chars.indexOf(base64[i + 3]);

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== 64) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    if (encoded4 !== 64) bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  return arrayBuffer;
};

export const PaymentsScreen = () => {
  const { user, refreshProfile } = useAuth();
  const { showDialog } = useDialog();

  const memberFee = user?.monthlyFee || resolvePlanFee(user?.plan) || 5000;

  const [payments, setPayments] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Form states
  const [selectedAccIndex, setSelectedAccIndex] = useState(0);
  const [amount, setAmount] = useState(String(memberFee));
  const [transactionNote, setTransactionNote] = useState('');
  const [screenshotUri, setScreenshotUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => {
    fetchPayments();
    fetchPaymentAccounts();
  }, [user?.id]);

  useEffect(() => {
    if (user?.monthlyFee || user?.plan) {
      const fee = user?.monthlyFee || resolvePlanFee(user?.plan) || 5000;
      setAmount(String(fee));
    }
  }, [user?.monthlyFee, user?.plan]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPayments();
    await fetchPaymentAccounts();
    if (refreshProfile) await refreshProfile();
    setRefreshing(false);
  };

  const fetchPayments = async () => {
    setLoading(true);
    if (isSupabaseConfigured() && user?.id) {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (error) {
          console.warn('Error fetching payments:', error.message);
          setPayments(getFallbackPayments());
        } else {
          const list = data && data.length > 0 ? data : getFallbackPayments();
          setPayments(list);
          if (data && data.length > 0) {
            NotificationService.evaluatePaymentApprovedNotification(data, user).catch(() => {});
          }
        }
      } catch (err) {
        console.error('Payments fetch error:', err);
        setPayments(getFallbackPayments());
      }
    } else {
      setPayments(getFallbackPayments());
    }
    setLoading(false);
  };

  const fetchPaymentAccounts = async () => {
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('payment_accounts')
          .select('*')
          .eq('is_active', true);
        if (data && data.length > 0) {
          setPaymentAccounts(data);
        } else {
          setPaymentAccounts(getDefaultAccounts());
        }
      } catch (e) {
        setPaymentAccounts(getDefaultAccounts());
      }
    } else {
      setPaymentAccounts(getDefaultAccounts());
    }
  };

  const getDefaultAccounts = () => [
    {
      id: '1',
      provider: 'JazzCash',
      account_title: 'ABDULLAH GYM 1',
      account_number: '0320 8313000',
      instructions: 'Transfer monthly fee via JazzCash app & attach screenshot proof.',
    },
    {
      id: '2',
      provider: 'EasyPaisa',
      account_title: 'ABDULLAH GYM 1',
      account_number: '0300 9876543',
      instructions: 'Send money to EasyPaisa account & upload transaction screenshot.',
    },
    {
      id: '3',
      provider: 'Meezan Bank',
      account_title: 'ABDULLAH GYM ENTERPRISES',
      account_number: '0101 0105 8472 9901',
      instructions: 'Transfer via IBFT / Mobile Banking and save screenshot receipt.',
    },
  ];

  const getFallbackPayments = () => [
    {
      id: 'pay-1',
      date: new Date().toISOString(),
      amount: 5000,
      status: 'Paid',
      invoice_id: 'INV-2026-084',
      payment_method: 'JazzCash Direct',
    },
    {
      id: 'pay-2',
      date: new Date(Date.now() - 30 * 86400000).toISOString(),
      amount: 5000,
      status: 'Paid',
      invoice_id: 'INV-2026-041',
      payment_method: 'Cash Desk',
    },
  ];

  const handleCopyAccount = (number, index) => {
    Clipboard.setString(number);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handlePickScreenshot = async (useCamera = false) => {
    try {
      let permissionResult;
      if (useCamera) {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permissionResult.granted) {
        showDialog({
          title: 'Permission Required',
          message: `Please grant ${useCamera ? 'camera' : 'photo library'} permissions to attach your payment proof.`,
          type: 'warning',
        });
        return;
      }

      const pickerResult = useCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.15,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'Images',
            allowsEditing: true,
            quality: 0.15,
            base64: true,
          });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        const asset = pickerResult.assets[0];
        const imageSource = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setScreenshotUri(imageSource);
      }
    } catch (err) {
      console.error('Error selecting image:', err);
      showDialog({
        title: 'Error',
        message: 'Failed to select image proof.',
        type: 'danger',
      });
    }
  };

  const activeAccount = paymentAccounts[selectedAccIndex] || paymentAccounts[0] || {
    provider: 'JazzCash',
    account_title: 'ABDULLAH GYM 1',
    account_number: '0320 8313000',
    instructions: 'Transfer monthly fee via JazzCash app & attach screenshot proof.',
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentMonthName = now.toLocaleString('default', { month: 'long' });

  const latestPaidPayment = payments.find((p) => p.status === 'Paid');
  const latestPendingPayment = payments.find(
    (p) => p.status === 'Pending Approval' || p.status === 'Pending'
  );

  const hasPendingProof = Boolean(
    latestPendingPayment &&
      (!latestPaidPayment || new Date(latestPendingPayment.date) >= new Date(latestPaidPayment.date))
  );

  const daysRemaining = user?.daysRemaining ?? 30;
  const overdueDays = user?.overdueDays ?? 0;
  const isGracePeriod = overdueDays > 0 && overdueDays <= 7;
  const isExpired = overdueDays > 7 || user?.status === 'Expired' || user?.status === 'Deactivated';

  // Payment window rule:
  // "any member can pay their fee in last 10 days when their membership expires to 7 day grace period"
  const isRenewalWindowOpen = daysRemaining <= 10 && daysRemaining > 0;
  const isEligibleToPay = isRenewalWindowOpen || isGracePeriod || isExpired || !latestPaidPayment;

  // Calculate Expiry Date & Renewal Open Date strings with stacked consecutive cycles
  let expiryDateObj = null;
  let renewalOpenDateObj = null;

  const paidPayments = payments
    .filter((p) => p.status === 'Paid' && p.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (paidPayments.length > 0) {
    let runningExpiry = null;
    paidPayments.forEach((pay) => {
      const payDate = new Date(pay.date);
      if (!runningExpiry) {
        runningExpiry = new Date(payDate.getTime() + 30 * 86400000);
      } else if (payDate <= runningExpiry) {
        // Early renewal: +30 days added after previous month completion
        runningExpiry = new Date(runningExpiry.getTime() + 30 * 86400000);
      } else {
        runningExpiry = new Date(payDate.getTime() + 30 * 86400000);
      }
    });
    expiryDateObj = runningExpiry;
  } else if (user?.expiryDate) {
    expiryDateObj = new Date(user.expiryDate);
  } else {
    expiryDateObj = new Date(now);
    expiryDateObj.setDate(expiryDateObj.getDate() + daysRemaining);
  }

  if (expiryDateObj) {
    renewalOpenDateObj = new Date(expiryDateObj);
    renewalOpenDateObj.setDate(renewalOpenDateObj.getDate() - 10);
  }

  const expiryDateStr = expiryDateObj
    ? expiryDateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    : `${currentMonthName} 30, ${currentYear}`;

  const renewalOpenDateStr = renewalOpenDateObj
    ? renewalOpenDateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })
    : '10 days before expiry';

  // Dynamic status for plan card
  let planStatus = 'Active';
  if (hasPendingProof) {
    planStatus = 'Pending Approval';
  } else if (isExpired) {
    planStatus = 'Expired';
  } else if (isGracePeriod) {
    planStatus = `Grace Period (Day ${overdueDays}/7)`;
  } else if (isRenewalWindowOpen) {
    planStatus = `Renewal Open (${daysRemaining}d Left)`;
  } else {
    planStatus = 'Paid ✓';
  }

  const handleSubmitOnlinePayment = async () => {
    if (hasPendingProof) {
      showDialog({
        title: 'Proof Under Review ⏳',
        message: 'Your payment transfer proof has already been submitted and is currently being verified by admin.',
        type: 'info',
      });
      setModalVisible(false);
      return;
    }

    if (!isEligibleToPay) {
      showDialog({
        title: 'Renewal Window Not Open 🔒',
        message: `Payment renewal opens 10 days before expiry (on ${renewalOpenDateStr}). You currently have ${daysRemaining} days remaining on your active membership.`,
        type: 'info',
      });
      setModalVisible(false);
      return;
    }

    if (!screenshotUri) {
      showDialog({
        title: 'Screenshot Required 📸',
        message: `Please attach your ${activeAccount.provider} transfer screenshot proof before submitting.`,
        type: 'warning',
      });
      return;
    }

    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      showDialog({
        title: 'Invalid Amount',
        message: 'Please enter a valid fee amount.',
        type: 'danger',
      });
      return;
    }

    setSubmitting(true);

    try {
      let uploadedPublicUrl = null;

      if (isSupabaseConfigured() && user?.id) {
        try {
          const timestamp = Date.now();
          const filePath = `${user.id}/proof_${timestamp}.jpg`;

          let fileBuffer = null;
          if (screenshotUri.startsWith('data:image')) {
            const base64Data = screenshotUri.split(',')[1];
            fileBuffer = decodeBase64ToArrayBuffer(base64Data);
          } else {
            const response = await fetch(screenshotUri);
            fileBuffer = await response.arrayBuffer();
          }

          if (fileBuffer) {
            const { error: uploadError } = await supabase.storage
              .from('payment-proofs')
              .upload(filePath, fileBuffer, {
                contentType: 'image/jpeg',
                upsert: true,
              });

            if (uploadError) {
              console.warn('Supabase storage upload error:', uploadError.message);
            } else {
              const { data: publicUrlData } = supabase.storage
                .from('payment-proofs')
                .getPublicUrl(filePath);
              uploadedPublicUrl = publicUrlData?.publicUrl || null;
            }
          }
        } catch (stgErr) {
          console.warn('Notice processing storage upload:', stgErr);
        }
      }

      const generatedInvoice = `INV-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`;
      const payload = {
        user_id: user?.id || 'demo-user-id',
        amount: numAmt,
        status: 'Pending Approval',
        payment_method: `${activeAccount.provider} Transfer`,
        invoice_id: generatedInvoice,
        date: new Date().toISOString(),
        total_fee: numAmt,
      };

      if (uploadedPublicUrl) {
        payload.proof_url = uploadedPublicUrl;
      }

      if (isSupabaseConfigured() && user?.id) {
        const { error } = await supabase.from('payments').insert([payload]);

        if (error && (error.code === 'PGRST204' || error.message.includes('proof_url') || error.message.includes('total_fee'))) {
          const safePayload = {
            user_id: user?.id || 'demo-user-id',
            amount: numAmt,
            status: 'Pending Approval',
            payment_method: `${activeAccount.provider} Transfer`,
            invoice_id: generatedInvoice,
            date: new Date().toISOString(),
          };
          const { error: fallbackErr } = await supabase.from('payments').insert([safePayload]);
          if (fallbackErr) throw fallbackErr;
        } else if (error) {
          throw error;
        }
      }

      // Close modal and reset state immediately
      setModalVisible(false);
      setScreenshotUri(null);
      setTransactionNote('');

      showDialog({
        title: 'Payment Proof Submitted! 🚀',
        message: `Thank you! Your ${activeAccount.provider} transfer proof has been submitted. The admin will verify and approve your membership renewal shortly.`,
        type: 'success',
      });

      // Refresh list & profile
      await fetchPayments();
      if (refreshProfile) await refreshProfile();
    } catch (err) {
      console.error('Error submitting online payment:', err);
      showDialog({
        title: 'Submission Error',
        message: err.message || 'Failed to submit payment proof.',
        type: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayPress = () => {
    if (hasPendingProof) {
      showDialog({
        title: 'Payment Proof Under Review ⏳',
        message:
          'Your transfer proof has already been submitted and is currently under admin review. Your membership will be extended once verified.',
        type: 'info',
      });
      return;
    }

    if (!isEligibleToPay) {
      showDialog({
        title: 'Membership Active & Up-to-Date 🛡️',
        message: `Your membership is active with ${daysRemaining} days remaining.\n\nRenewal payments open 10 days before expiry (on ${renewalOpenDateStr}).`,
        type: 'info',
      });
      return;
    }

    setModalVisible(true);
  };

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
        <GymHeader variant="payments" userName={user?.name || 'Member'} />

        {/* Active Subscription Billing Pass */}
        <PaymentCard
          isCurrent={true}
          title={user?.plan || 'Pro Membership'}
          amount={`PKR ${memberFee.toLocaleString()}`}
          status={planStatus}
          nextDate={
            hasPendingProof
              ? 'Under Review'
              : !isEligibleToPay
              ? expiryDateStr
              : isGracePeriod
              ? `Grace Expiry: Day ${overdueDays}/7`
              : expiryDateStr
          }
        />

        {/* Scheduled Upcoming Plan Banner (if any) */}
        {user?.upcomingPlan ? (
          <View style={styles.upcomingPlanCard}>
            <View style={styles.upcomingHeaderRow}>
              <View style={styles.upcomingIconBox}>
                <Ionicons name="time" size={16} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.upcomingTitle}>Scheduled for Next Cycle</Text>
                <Text style={styles.upcomingSub}>{user.upcomingPlan}</Text>
              </View>
            </View>
            <Text style={styles.upcomingNote}>
              💡 Your current plan remains active this month. The new tier will apply on next payment renewal.
            </Text>
          </View>
        ) : null}

        {/* Status / Window Banners */}
        {hasPendingProof ? (
          <View style={styles.pendingReviewBanner}>
            <Ionicons name="hourglass-outline" size={16} color="#D97706" />
            <Text style={styles.pendingReviewText}>
              Proof Submitted: Awaiting admin approval to extend your membership pass.
            </Text>
          </View>
        ) : isGracePeriod ? (
          <View style={styles.gracePeriodBanner}>
            <Ionicons name="warning-outline" size={16} color="#C2410C" />
            <Text style={styles.gracePeriodText}>
              ⚠️ 7-Day Grace Period (Day {overdueDays} of 7): Please pay your monthly fee before day 7 to prevent account expiration.
            </Text>
          </View>
        ) : isRenewalWindowOpen ? (
          <View style={styles.renewalOpenBanner}>
            <Ionicons name="notifications-circle-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.renewalOpenText}>
              🔔 10-Day Renewal Window Open: {daysRemaining} days left. Submit transfer proof now to renew for the next cycle.
            </Text>
          </View>
        ) : !isEligibleToPay ? (
          <View style={styles.earlyActiveBanner}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#047857" />
            <Text style={styles.earlyActiveText}>
              ✓ Membership Active ({daysRemaining} Days Left). Renewal opens 10 days before expiry (on {renewalOpenDateStr}).
            </Text>
          </View>
        ) : null}

        {/* Monthly Fee Action CTA Button */}
        <TouchableOpacity
          style={[
            styles.mainPayBtn,
            hasPendingProof && styles.pendingMainBtn,
            !isEligibleToPay && !hasPendingProof && styles.activeMainBtn,
            isGracePeriod && !hasPendingProof && styles.graceMainBtn,
            isExpired && !hasPendingProof && styles.expiredMainBtn,
          ]}
          onPress={handlePayPress}
          activeOpacity={0.8}
        >
          <Ionicons
            name={
              hasPendingProof
                ? 'time'
                : !isEligibleToPay
                ? 'shield-checkmark'
                : isGracePeriod
                ? 'alert-circle'
                : isExpired
                ? 'lock-closed'
                : 'card'
            }
            size={20}
            color={colors.white}
          />
          <Text style={styles.mainPayBtnText}>
            {hasPendingProof
              ? 'Transfer Proof Under Review ⏳'
              : !isEligibleToPay
              ? `Membership Active (${daysRemaining} Days Left) ✓`
              : isGracePeriod
              ? `Pay Overdue Fee (Grace Day ${overdueDays}/7)`
              : isExpired
              ? `Pay Fee to Reactivate Account`
              : `Submit Renewal Proof (PKR ${memberFee.toLocaleString()})`}
          </Text>
        </TouchableOpacity>

        {/* Payment History Invoices */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          <View style={styles.historyBadge}>
            <Text style={styles.historyBadgeText}>{payments.length} Invoices</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginVertical: 20 }} />
        ) : payments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Invoices Found</Text>
            <Text style={styles.emptySubtitle}>Completed and pending payments will appear here.</Text>
          </View>
        ) : (
          payments.map((p, idx) => {
            const dt = p.date ? new Date(p.date) : new Date();
            const dateStr = dt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            return (
              <PaymentCard
                key={p.id || String(idx)}
                isCurrent={false}
                title="Monthly Gym Fee"
                amount={`PKR ${(p.total_fee || p.amount || 5000).toLocaleString()}`}
                date={dateStr}
                method={p.payment_method || 'Desk / Counter'}
                status={p.status || 'Paid'}
                invoiceId={p.invoice_id}
              />
            );
          })
        )}
      </ScrollView>

      {/* Online Transfer Proof Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Submit Transfer Proof</Text>
                <Text style={styles.modalSubtitle}>Select account & attach transfer screenshot</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
              {/* Account Selection Carousel */}
              <Text style={styles.inputLabel}>Select Gym Account</Text>
              <View style={styles.accountSelectorRow}>
                {paymentAccounts.map((acc, idx) => {
                  const isSelected = selectedAccIndex === idx;
                  return (
                    <TouchableOpacity
                      key={acc.id || String(idx)}
                      style={[styles.accountTab, isSelected && styles.accountTabActive]}
                      onPress={() => setSelectedAccIndex(idx)}
                    >
                      <Ionicons
                        name="wallet-outline"
                        size={14}
                        color={isSelected ? colors.white : colors.textSecondary}
                      />
                      <Text style={[styles.accountTabText, isSelected && styles.accountTabTextActive]}>
                        {acc.provider}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Active Account Details Box */}
              <View style={styles.accountDetailsBox}>
                <View style={styles.accDetailRow}>
                  <Text style={styles.accDetailLabel}>Account Title:</Text>
                  <Text style={styles.accDetailValue}>{activeAccount.account_title}</Text>
                </View>

                <View style={styles.accDetailRow}>
                  <Text style={styles.accDetailLabel}>Account / IBAN:</Text>
                  <Text style={styles.accNumberHighlight}>{activeAccount.account_number}</Text>
                </View>

                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => handleCopyAccount(activeAccount.account_number, selectedAccIndex)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={copiedIndex === selectedAccIndex ? 'checkmark-circle' : 'copy-outline'}
                    size={14}
                    color={copiedIndex === selectedAccIndex ? colors.primaryDark : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.copyBtnText,
                      copiedIndex === selectedAccIndex && { color: colors.primaryDark, fontWeight: '800' },
                    ]}
                  >
                    {copiedIndex === selectedAccIndex ? 'Copied to Clipboard!' : 'Copy Account Number'}
                  </Text>
                </TouchableOpacity>

                {activeAccount.instructions ? (
                  <Text style={styles.accInstructions}>📌 {activeAccount.instructions}</Text>
                ) : null}
              </View>

              {/* Amount Input */}
              <Text style={styles.inputLabel}>Amount (PKR)</Text>
              <TextInput
                style={styles.textInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="5000"
              />

              {/* Transaction Note */}
              <Text style={styles.inputLabel}>Transaction ID / Note (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={transactionNote}
                onChangeText={setTransactionNote}
                placeholder="e.g. TID-982138 or Member Note"
                placeholderTextColor={colors.textMuted}
              />

              {/* Upload Screenshot Zone */}
              <Text style={styles.inputLabel}>Attach Screenshot Receipt *</Text>
              {screenshotUri ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: screenshotUri }} style={styles.previewImage} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.removeProofBtn}
                    onPress={() => setScreenshotUri(null)}
                  >
                    <Ionicons name="trash" size={16} color={colors.white} />
                    <Text style={styles.removeProofText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadZone}>
                  <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                  <Text style={styles.uploadZoneText}>Attach your payment receipt screenshot</Text>
                  <View style={styles.uploadActionRow}>
                    <TouchableOpacity
                      style={styles.uploadChoiceBtn}
                      onPress={() => handlePickScreenshot(false)}
                    >
                      <Ionicons name="images-outline" size={16} color={colors.primaryDark} />
                      <Text style={styles.uploadChoiceText}>Choose Image</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.uploadChoiceBtn}
                      onPress={() => handlePickScreenshot(true)}
                    >
                      <Ionicons name="camera-outline" size={16} color={colors.primaryDark} />
                      <Text style={styles.uploadChoiceText}>Take Photo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitProofBtn, submitting && { opacity: 0.7 }]}
                onPress={handleSubmitOnlinePayment}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.white} style={{ marginRight: 6 }} />
                    <Text style={styles.submitProofBtnText}>Submit Transfer Proof</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  mainPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 52,
    marginBottom: 16,
    ...theme.shadows.medium,
  },
  activeMainBtn: {
    backgroundColor: '#0F172A',
  },
  pendingMainBtn: {
    backgroundColor: '#D97706',
  },
  graceMainBtn: {
    backgroundColor: '#EA580C',
  },
  expiredMainBtn: {
    backgroundColor: '#DC2626',
  },
  mainPayBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.2,
  },
  pendingReviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  pendingReviewText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
    lineHeight: 15,
  },
  gracePeriodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEDD5',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  gracePeriodText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9A3412',
    flex: 1,
    lineHeight: 15,
  },
  renewalOpenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  renewalOpenText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    flex: 1,
    lineHeight: 15,
  },
  earlyActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  earlyActiveText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 15,
  },
  upcomingPlanCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    ...theme.shadows.soft,
  },
  upcomingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  upcomingIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  upcomingSub: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78350F',
    marginTop: 1,
  },
  upcomingNote: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 15,
    fontWeight: '500',
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
  },
  historyBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  historyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  accountSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  accountTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  accountTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  accountTabTextActive: {
    color: colors.white,
  },
  accountDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 4,
  },
  accDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  accDetailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  accDetailValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  accNumberHighlight: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primaryDark,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 6,
    marginTop: 8,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  accInstructions: {
    fontSize: 11,
    color: '#0F766E',
    marginTop: 8,
    lineHeight: 15,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  uploadZone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  uploadZoneText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 10,
  },
  uploadActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  uploadChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  uploadChoiceText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  previewContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#E2E8F0',
  },
  removeProofBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  removeProofText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
  },
  submitProofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 50,
    marginTop: 18,
    marginBottom: 16,
    ...theme.shadows.medium,
  },
  submitProofBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
});

export default PaymentsScreen;
