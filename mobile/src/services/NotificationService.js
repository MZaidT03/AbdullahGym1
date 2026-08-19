import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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

  // Sync notifications from Supabase table for this user
  async syncRemoteNotifications(userId) {
    if (!userId || !isSupabaseConfigured()) return [];
    try {
      const { data: remoteList, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error || !remoteList) return [];

      const existing = await this.getLocalNotifications();
      const existingMap = new Map();
      existing.forEach((n) => existingMap.set(n.id || n.dedupeKey, n));

      remoteList.forEach((r) => {
        const idKey = `remote_${r.id}`;
        if (!existingMap.has(idKey)) {
          existingMap.set(idKey, {
            id: idKey,
            title: r.title,
            message: r.message,
            type: r.type || 'general',
            timestamp: r.created_at || new Date().toISOString(),
            dateStr: new Date(r.created_at || Date.now()).toDateString(),
            read: r.read || false,
            action: r.action || 'VIEW',
            dedupeKey: `remote_${r.id}`,
          });
        }
      });

      const merged = Array.from(existingMap.values())
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 30);

      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.warn('Error syncing remote notifications:', e);
      return [];
    }
  },

  // Get local notifications from storage
  async getLocalNotifications() {
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  },

  // Get all notifications (syncs with Supabase if userId provided)
  async getNotifications(userId = null) {
    try {
      if (userId) {
        await this.syncRemoteNotifications(userId);
      }
      return await this.getLocalNotifications();
    } catch (e) {
      return await this.getLocalNotifications();
    }
  },

  // Add a new notification (deduplicating by key/id within the same day)
  async addNotification(notif) {
    try {
      const isEnabled = await this.arePushNotificationsEnabled();
      if (!isEnabled && notif.type !== 'system') return;

      const existing = await this.getLocalNotifications();
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
        type: notif.type || 'fee_deadline', // 'fee_deadline' | 'payment_confirmed' | 'payment_approved' | 'attendance_marked' | 'profile_updated' | 'expired' | 'general'
        timestamp: new Date().toISOString(),
        dateStr: todayDateStr,
        read: false,
        action: notif.action || 'PAY_FEE',
        dedupeKey: notif.dedupeKey || null,
        daysRemaining: notif.daysRemaining,
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
      const list = await this.getLocalNotifications();
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
    const planName = user.plan || 'Pro Membership';
    const isExpired = daysRemaining <= 0 || user.status === 'Expired' || user.status === 'Deactivated' || user.status === 'Suspended';

    // 1. Account Expired / Deactivated (Month completed)
    if (isExpired) {
      return await this.addNotification({
        title: '🔒 Membership Expired - Account Deactivated',
        message: 'Your monthly membership validity has ended. Submit your renewal fee in the Payments tab to reactivate check-in access.',
        type: 'expired',
        dedupeKey: 'account_expired_notice',
        action: 'PAY_FEE',
      });
    }

    // 2. Last 10 Days Renewal Window
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
