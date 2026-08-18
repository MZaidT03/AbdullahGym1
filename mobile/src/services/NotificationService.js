import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_STORAGE_KEY = '@abdullah_gym1_notifications';
const PREFS_STORAGE_KEY = '@abdullah_gym1_push_prefs';

export const NotificationService = {
  // Check if push notifications are enabled
  async arePushNotificationsEnabled() {
    try {
      const val = await AsyncStorage.getItem(PREFS_STORAGE_KEY);
      return val !== null ? JSON.parse(val) : true;
    } catch (e) {
      return true;
    }
  },

  async setPushNotificationsEnabled(enabled) {
    try {
      await AsyncStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(enabled));
    } catch (e) {
      console.warn('Error saving push notification preference:', e);
    }
  },

  // Get all notifications from storage
  async getNotifications() {
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  },

  // Add a new notification (deduplicating by key/id within the same day)
  async addNotification(notif) {
    try {
      const isEnabled = await this.arePushNotificationsEnabled();
      if (!isEnabled && notif.type !== 'system') return;

      const existing = await this.getNotifications();
      const todayDateStr = new Date().toDateString();

      // Avoid spamming the exact same fee alert on the same calendar day
      const isDuplicate = existing.some(
        (n) => n.dedupeKey && n.dedupeKey === notif.dedupeKey && n.dateStr === todayDateStr
      );

      if (isDuplicate) return;

      const newEntry = {
        id: notif.id || `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        title: notif.title,
        message: notif.message,
        type: notif.type || 'fee_deadline', // 'fee_deadline' | 'grace_period' | 'payment_confirmed' | 'general'
        timestamp: new Date().toISOString(),
        dateStr: todayDateStr,
        read: false,
        action: notif.action || 'PAY_FEE',
        dedupeKey: notif.dedupeKey || null,
        daysRemaining: notif.daysRemaining,
        overdueDays: notif.overdueDays,
      };

      const updated = [newEntry, ...existing].slice(0, 30); // Keep latest 30 notifications
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      return newEntry;
    } catch (e) {
      console.warn('Error adding notification:', e);
    }
  },

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      const list = await this.getNotifications();
      const updated = list.map((n) => ({ ...n, read: true }));
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      return [];
    }
  },

  // Clear all notifications
  async clearAll() {
    try {
      await AsyncStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
      return [];
    } catch (e) {
      return [];
    }
  },

  // Evaluate fee deadline and trigger automatic notification if due
  async evaluateFeeDeadlineNotification(user) {
    if (!user) return null;

    const daysRemaining = user.daysRemaining !== undefined ? user.daysRemaining : 30;
    const overdueDays = user.overdueDays !== undefined ? user.overdueDays : 0;
    const planName = user.plan || 'Pro Membership';
    const memberFee = user.monthlyFee || 5000;

    // 1. In 7-Day Grace Period (Day 1 to 7)
    if (overdueDays > 0 && overdueDays <= 7) {
      if (overdueDays >= 6) {
        return await this.addNotification({
          title: '🚨 Final Warning: Grace Period Ending!',
          message: `Your membership is in Day ${overdueDays} of 7 grace period. Account will be DEACTIVATED after Day 7! Pay PKR ${memberFee.toLocaleString()} now.`,
          type: 'grace_period',
          dedupeKey: `grace_day_${overdueDays}`,
          overdueDays: overdueDays,
          action: 'PAY_FEE',
        });
      } else if (overdueDays >= 3) {
        return await this.addNotification({
          title: '⚠️ Urgent: 7-Day Grace Period Active',
          message: `Day ${overdueDays} of 7 grace period for ${planName}. Please submit your monthly renewal fee to maintain gym access.`,
          type: 'grace_period',
          dedupeKey: `grace_day_${overdueDays}`,
          overdueDays: overdueDays,
          action: 'PAY_FEE',
        });
      } else {
        return await this.addNotification({
          title: '⚠️ Membership Expired - Grace Period Active',
          message: `Your month completed today (Grace Day ${overdueDays}/7). You have 7 days to clear your monthly fee of PKR ${memberFee.toLocaleString()}.`,
          type: 'grace_period',
          dedupeKey: `grace_day_${overdueDays}`,
          overdueDays: overdueDays,
          action: 'PAY_FEE',
        });
      }
    }

    // 2. Account Expired / Deactivated (>7 days)
    if (overdueDays > 7 || user.status === 'Expired' || user.status === 'Suspended' || user.status === 'Deactivated' || user.status === 'Inactive') {
      return await this.addNotification({
        title: '🔒 Account Expired / Deactivated',
        message: 'Your 7-day grace period has ended. Submit your monthly payment in the Payments tab to reactivate check-in access.',
        type: 'expired',
        dedupeKey: 'account_expired',
        action: 'PAY_FEE',
      });
    }

    // 3. Last 10 Days Renewal Window
    if (daysRemaining === 1) {
      return await this.addNotification({
        title: '🚨 Urgent: Fee Due Tomorrow!',
        message: `Your ${planName} expires tomorrow! Pay today to smoothly extend your next 30 days without interruption.`,
        type: 'fee_deadline',
        dedupeKey: 'fee_due_tomorrow',
        daysRemaining: 1,
        action: 'PAY_FEE',
      });
    }

    if (daysRemaining === 3) {
      return await this.addNotification({
        title: '⏳ Fee Deadline in 3 Days',
        message: `Your ${planName} expires in 3 days. Early payment will automatically start after your current month ends.`,
        type: 'fee_deadline',
        dedupeKey: 'fee_due_3_days',
        daysRemaining: 3,
        action: 'PAY_FEE',
      });
    }

    if (daysRemaining === 5) {
      return await this.addNotification({
        title: '📅 5 Days Left Until Fee Deadline',
        message: `Your gym membership validity expires in 5 days. Submit your transfer receipt via JazzCash/EasyPaisa to renew.`,
        type: 'fee_deadline',
        dedupeKey: 'fee_due_5_days',
        daysRemaining: 5,
        action: 'PAY_FEE',
      });
    }

    if (daysRemaining === 10) {
      return await this.addNotification({
        title: '🔔 10-Day Fee Renewal Window Open',
        message: `You have 10 days remaining on ${planName}. Renewal is now open! Pay early and your new 30 days will stack seamlessly.`,
        type: 'fee_deadline',
        dedupeKey: 'fee_due_10_days',
        daysRemaining: 10,
        action: 'PAY_FEE',
      });
    }

    return null;
  },

  // Evaluate approved payments and dispatch confirmation push notification
  async evaluatePaymentApprovedNotification(payments = [], user = null) {
    if (!payments || payments.length === 0) return null;

    const paidPayments = payments.filter((p) => p.status === 'Paid');
    if (paidPayments.length === 0) return null;

    // Get latest approved payment
    const latestPaid = paidPayments[0];
    const amount = Number(latestPaid.total_fee || latestPaid.amount || 5000).toLocaleString();
    const planName = user?.plan || 'Pro Membership';

    return await this.addNotification({
      title: '🎉 Payment Approved & Membership Active!',
      message: `Your fee payment of PKR ${amount} has been verified and approved by admin. 30 days have been added to your ${planName} membership pass!`,
      type: 'payment_confirmed',
      dedupeKey: `pay_approved_${latestPaid.id || latestPaid.invoice_id}`,
      action: 'VIEW_PASS',
    });
  },
};

export default NotificationService;
