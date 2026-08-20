import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Clipboard,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth, resolvePlanFee, cleanPlanName } from '../context/AuthContext';
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
  const { user, refreshProfile, removeMemberAddon, availablePlans } = useAuth();
  const { showDialog } = useDialog();

  const baseMembershipFee = user?.monthlyFee || resolvePlanFee(user?.plan, availablePlans) || 5000;
  const activeAddonsList = user?.activeAddons || [];
  const primaryAddon = activeAddonsList.length > 0 ? activeAddonsList[0] : { id: 'addon-1', addonId: 'addon-1', name: 'Cardio Access Plan', price: 1500, icon: '🏃' };
  const addonFee = Number(primaryAddon.price) || 1500;
  const totalAddonsFee = activeAddonsList.length > 0 ? activeAddonsList.reduce((sum, a) => sum + (Number(a.price) || 0), 0) : addonFee;
  const combinedFee = baseMembershipFee + totalAddonsFee;
  const memberFee = baseMembershipFee;

  const [payments, setPayments] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Form states
  const [selectedAccIndex, setSelectedAccIndex] = useState(0);
  const [paymentOption, setPaymentOption] = useState('membership'); // 'membership' | 'addon' | 'bundle'
  const [selectedAddonForPayment, setSelectedAddonForPayment] = useState(null);
  const [amount, setAmount] = useState(String(baseMembershipFee));
  const [transactionNote, setTransactionNote] = useState('');
  const [screenshotUri, setScreenshotUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => {
    fetchPayments();
    fetchPaymentAccounts();
  }, [user?.id]);

  useEffect(() => {
    if (paymentOption === 'addon') {
      setAmount(String(addonFee));
    } else if (paymentOption === 'bundle') {
      setAmount(String(combinedFee));
    } else {
      setAmount(String(baseMembershipFee));
    }
  }, [paymentOption, baseMembershipFee, addonFee, combinedFee]);

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
        const { data: gymPayData } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        let addonPayData = [];
        try {
          const { data: aData } = await supabase
            .from('addon_payments')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });
          if (aData) addonPayData = aData;
        } catch (e) {}

        const normalizedGym = (gymPayData || []).map((p) => ({
          ...p,
          isAddon: false,
          displayTitle: `${cleanPlanName(p.item_name || user?.plan || 'Standard Monthly Pass')}`,
        }));

        const normalizedAddons = (addonPayData || []).map((p) => ({
          ...p,
          isAddon: true,
          displayTitle: `${p.addon_name || p.item_name || 'Cardio Access'} (Add-on)`,
        }));

        const combinedList = [...normalizedGym, ...normalizedAddons].sort(
          (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
        );

        setPayments(combinedList.length > 0 ? combinedList : getFallbackPayments());

        if (gymPayData && gymPayData.length > 0) {
          NotificationService.evaluatePaymentApprovedNotification(gymPayData, user).catch(() => {});
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
  const isExpired = daysRemaining <= 0 || user?.status === 'Expired' || user?.status === 'Deactivated' || user?.status === 'Suspended';

  // Payment window rule: member can pay in the last 10 days of their month or when expired
  const isRenewalWindowOpen = daysRemaining <= 10 && daysRemaining > 0;
  const isEligibleToPay = isRenewalWindowOpen || isExpired || !latestPaidPayment;

  // Calculate Expiry Date & Renewal Open Date strings with stacked consecutive cycles
  let expiryDateObj = null;
  let renewalOpenDateObj = null;

  const paidPayments = payments
    .filter((p) => {
      if (p.status !== 'Paid' || !p.date) return false;
      if (p.payment_type === 'addon' || p.is_addon) return false;
      const itName = (p.item_name || p.plan || '').toLowerCase();
      if (
        itName.includes('(add-on)') ||
        itName.includes('add-on') ||
        itName.includes('cardio') ||
        itName.includes('trainer') ||
        itName.includes('sauna')
      )
        return false;
      return true;
    })
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
  } else if (isRenewalWindowOpen) {
    planStatus = `Renewal Open (${daysRemaining}d Left)`;
  } else {
    planStatus = 'Paid ✓';
  }

  const handleSubmitOnlinePayment = async () => {
    const isAddonOnlyPayment = paymentOption === 'addon';

    if (isAddonOnlyPayment) {
      // Standalone Add-on Renewal check: verify if this specific add-on has a pending proof
      const targetAddon = selectedAddonForPayment || primaryAddon;
      const targetAddonId = targetAddon?.id || targetAddon?.addonId;
      const targetAddonName = targetAddon?.name || 'Cardio';

      const hasPendingForThisAddon = payments.some(
        (p) =>
          (p.status === 'Pending Approval' || p.status === 'Pending') &&
          (p.payment_type === 'addon' ||
            p.addon_id === targetAddonId ||
            (p.item_name || '').toLowerCase().includes(targetAddonName.toLowerCase()))
      );

      if (hasPendingForThisAddon) {
        showDialog({
          title: 'Proof Under Review ⏳',
          message: `Your payment proof for '${targetAddonName}' has already been submitted and is currently being verified by admin.`,
          type: 'info',
        });
        setModalVisible(false);
        return;
      }
    } else {
      // Main Membership Renewal check
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

      if (isSupabaseConfigured() && user?.id) {
        if (paymentOption === 'membership') {
          // 1. Gym Plan Payment (into payments table)
          const gymPayload = {
            user_id: user.id,
            amount: baseMembershipFee,
            total_fee: baseMembershipFee,
            status: 'Pending Approval',
            payment_method: `${activeAccount.provider} Transfer`,
            payment_type: 'membership',
            item_name: cleanPlanName(user?.plan || 'Pro Membership'),
            invoice_id: generatedInvoice,
            date: new Date().toISOString(),
          };
          if (uploadedPublicUrl) gymPayload.proof_url = uploadedPublicUrl;
          await supabase.from('payments').insert([gymPayload]);
        } else if (paymentOption === 'addon') {
          // 2. Add-on Payment ONLY (into dedicated addon_payments table)
          const targetAddon = selectedAddonForPayment || primaryAddon;
          const targetAddonId = targetAddon.id || targetAddon.addonId || 'addon-1';
          const targetAddonName = targetAddon.name || 'Cardio Access Plan';
          const targetAddonPrice = Number(amount) || Number(targetAddon.price) || addonFee;

          const addonPayload = {
            user_id: user.id,
            addon_id: targetAddonId,
            addon_name: targetAddonName,
            amount: targetAddonPrice,
            status: 'Pending Approval',
            payment_method: `${activeAccount.provider} Transfer`,
            invoice_id: `INV-ADD-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toISOString(),
          };
          if (uploadedPublicUrl) addonPayload.proof_url = uploadedPublicUrl;
          await supabase.from('addon_payments').insert([addonPayload]);
        } else if (paymentOption === 'bundle') {
          // 3. Both Combined: Insert 1 Gym payment row into payments + 1 Addon row into addon_payments
          const gymPayload = {
            user_id: user.id,
            amount: baseMembershipFee,
            total_fee: baseMembershipFee,
            status: 'Pending Approval',
            payment_method: `${activeAccount.provider} Transfer`,
            payment_type: 'membership',
            item_name: cleanPlanName(user?.plan || 'Pro Membership'),
            invoice_id: generatedInvoice,
            date: new Date().toISOString(),
          };
          if (uploadedPublicUrl) gymPayload.proof_url = uploadedPublicUrl;

          const targetAddon = selectedAddonForPayment || primaryAddon;
          const addonPayload = {
            user_id: user.id,
            addon_id: targetAddon.addonId || targetAddon.id || 'addon-1',
            addon_name: targetAddon.name || 'Cardio Access Plan',
            amount: Number(targetAddon.price) || addonFee,
            status: 'Pending Approval',
            payment_method: `${activeAccount.provider} Transfer`,
            invoice_id: `INV-ADD-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toISOString(),
          };
          if (uploadedPublicUrl) addonPayload.proof_url = uploadedPublicUrl;

          await supabase.from('payments').insert([gymPayload]);
          await supabase.from('addon_payments').insert([addonPayload]);
        }
      }

      // Close modal and reset state immediately
      setModalVisible(false);
      setScreenshotUri(null);
      setTransactionNote('');

      showDialog({
        title: 'Payment Proof Submitted! 🚀',
        message: `Thank you! Your ${activeAccount.provider} transfer proof has been submitted. The admin will verify and approve your pass shortly.`,
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

  const handleRemoveAddon = (addonId) => {
    showDialog({
      type: 'confirm',
      title: 'Remove Add-on Pass?',
      message: 'Are you sure you want to remove this add-on? It will be removed from your membership and no additional fee will be required.',
      onConfirm: async () => {
        if (removeMemberAddon) {
          const res = await removeMemberAddon(addonId);
          if (res?.success) {
            showDialog({
              type: 'success',
              title: 'Add-on Removed',
              message: 'The add-on has been removed from your membership.',
            });
            await fetchPayments();
          }
        }
      },
    });
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
          title={cleanPlanName(user?.plan || 'Pro Membership')}
          amount={`PKR ${baseMembershipFee.toLocaleString()}`}
          status={planStatus}
          nextDate={
            hasPendingProof
              ? 'Under Review'
              : isExpired
              ? 'Expired (Renewal Due)'
              : expiryDateStr
          }
        />

        {/* Active Add-On Passes (with independent 30-day lifecycles) */}
        {user?.activeAddons && user.activeAddons.length > 0 ? (
          <View style={styles.addonPassesSection}>
            <View style={styles.addonPassesHeaderRow}>
              <Text style={styles.addonPassesHeader}>ACTIVE ADD-ON PASSES</Text>
              <Text style={styles.addonPassesSub}>Independent 30-Day Validity</Text>
            </View>
            {user.activeAddons.map((addon) => {
              const isAddonExpired = addon.daysRemaining <= 0;
              return (
                <View key={addon.id} style={[styles.addonPassCard, isAddonExpired && styles.addonCardExpiredBorder]}>
                  <View style={styles.addonPassTop}>
                    <View style={styles.addonPassLeft}>
                      <View style={[styles.addonPassIconCircle, isAddonExpired && styles.addonIconCircleExpired]}>
                        <Text style={styles.addonPassIcon}>{addon.icon || '🏃'}</Text>
                      </View>
                      <View>
                        <Text style={styles.addonPassName}>{addon.name}</Text>
                        <Text style={styles.addonPassPrice}>PKR {Number(addon.price).toLocaleString()} / 30 days</Text>
                      </View>
                    </View>
                    <View style={styles.addonPassRight}>
                      <View
                        style={[
                          styles.addonPassBadge,
                          !isAddonExpired ? styles.badgeActive : styles.badgeExpired,
                        ]}
                      >
                        <Text
                          style={[
                            styles.addonPassBadgeText,
                            !isAddonExpired ? styles.textActive : styles.textExpired,
                          ]}
                        >
                          {!isAddonExpired ? `${addon.daysRemaining}d Left` : 'Expired'}
                        </Text>
                      </View>
                      <Text style={styles.addonPassExpiry}>
                        {addon.expiryDate
                          ? `Exp: ${new Date(addon.expiryDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                          : '30 days cycle'}
                      </Text>
                    </View>
                  </View>

                  {/* Expired Add-on Notice & Actions */}
                  {isAddonExpired ? (
                    <View style={styles.addonExpiredAlertBox}>
                      <View style={styles.addonExpiredNoticeRow}>
                        <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
                        <Text style={styles.addonExpiredNoticeText}>
                          Cardio add-on pass expired. Pay fee to renew or remove this add-on.
                        </Text>
                      </View>
                      <View style={styles.addonActionBtnsRow}>
                        <TouchableOpacity
                          style={styles.addonPayBtn}
                          onPress={() => {
                            setSelectedAddonForPayment(addon);
                            setPaymentOption('addon');
                            setAmount(String(addon.price || 1500));
                            setModalVisible(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="card-outline" size={13} color={colors.white} />
                          <Text style={styles.addonPayBtnText}>Pay PKR {Number(addon.price).toLocaleString()}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.addonRemoveBtn}
                          onPress={() => handleRemoveAddon(addon.id || addon.addonId)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="trash-outline" size={13} color="#DC2626" />
                          <Text style={styles.addonRemoveBtnText}>Remove Add-on</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

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
        ) : isExpired ? (
          <View style={styles.expiredBanner}>
            <Ionicons name="lock-closed-outline" size={16} color="#DC2626" />
            <Text style={styles.expiredBannerText}>
              🔒 Membership Expired: Your monthly validity has ended. Submit transfer proof now to reactivate your gym access.
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
              : isExpired
              ? `Reactivate Membership (PKR ${memberFee.toLocaleString()})`
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
                title={p.displayTitle || (p.isAddon ? `${p.addon_name || 'Cardio Pass'} (Add-on)` : 'Monthly Gym Fee')}
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
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

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingVertical: 12 }}
            >
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

              {/* Payment Type Selection (Membership / Cardio Addon / Both) */}
              <Text style={styles.inputLabel}>What are you paying for?</Text>
              <View style={styles.paymentTypeSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.payTypeCard,
                    paymentOption === 'membership' && styles.payTypeCardActive,
                  ]}
                  onPress={() => setPaymentOption('membership')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.payTypeTitle, paymentOption === 'membership' && styles.payTypeTitleActive]}>
                    🏋️ Gym Plan
                  </Text>
                  <Text style={[styles.payTypeFee, paymentOption === 'membership' && styles.payTypeFeeActive]}>
                    PKR {baseMembershipFee.toLocaleString()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.payTypeCard,
                    paymentOption === 'addon' && styles.payTypeCardActive,
                  ]}
                  onPress={() => setPaymentOption('addon')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.payTypeTitle, paymentOption === 'addon' && styles.payTypeTitleActive]}>
                    🏃 Cardio Pass
                  </Text>
                  <Text style={[styles.payTypeFee, paymentOption === 'addon' && styles.payTypeFeeActive]}>
                    PKR {addonFee.toLocaleString()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.payTypeCard,
                    paymentOption === 'bundle' && styles.payTypeCardActive,
                  ]}
                  onPress={() => setPaymentOption('bundle')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.payTypeTitle, paymentOption === 'bundle' && styles.payTypeTitleActive]}>
                    ✨ Both Combined
                  </Text>
                  <Text style={[styles.payTypeFee, paymentOption === 'bundle' && styles.payTypeFeeActive]}>
                    PKR {combinedFee.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount Input */}
              <Text style={styles.inputLabel}>Amount to Transfer (PKR)</Text>
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
        </KeyboardAvoidingView>
      </Modal>
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
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  expiredBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
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
  addonPassesSection: {
    marginBottom: 12,
  },
  addonPassesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  addonPassesHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  addonPassesSub: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  addonPassCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  addonCardExpiredBorder: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
  },
  addonPassTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addonPassLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addonPassIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addonIconCircleExpired: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  addonPassIcon: {
    fontSize: 18,
  },
  addonPassName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addonPassPrice: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  addonPassRight: {
    alignItems: 'flex-end',
  },
  addonPassBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 2,
  },
  badgeActive: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  badgeExpired: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  addonPassBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textActive: {
    color: colors.primaryDark,
  },
  textExpired: {
    color: '#DC2626',
  },
  addonPassExpiry: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  addonExpiredAlertBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
  },
  addonExpiredNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  addonExpiredNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
    flex: 1,
  },
  addonActionBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addonPayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  addonPayBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },
  addonRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  addonRemoveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  paymentTypeSelectorRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  payTypeCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payTypeCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: colors.primary,
  },
  payTypeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  payTypeTitleActive: {
    color: colors.primaryDark,
    fontWeight: '800',
  },
  payTypeFee: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  payTypeFeeActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
});

export default PaymentsScreen;
