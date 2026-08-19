import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const NotificationModal = ({
  visible,
  onClose,
  notifications = [],
  onPayPress,
  onClearAll,
}) => {
  const getIconForType = (type) => {
    switch (type) {
      case 'expired':
        return { name: 'close-circle', color: '#DC2626', bg: '#FEE2E2' };
      case 'payment_approved':
      case 'payment_confirmed':
        return { name: 'checkmark-circle', color: colors.primaryDark, bg: '#F0FDF4' };
      case 'attendance_marked':
      case 'attendance':
        return { name: 'barbell', color: '#2563EB', bg: '#EFF6FF' };
      case 'profile_updated':
        return { name: 'person-circle', color: '#7C3AED', bg: '#F5F3FF' };
      default: // 'fee_deadline'
        return { name: 'time', color: '#2563EB', bg: '#EFF6FF' };
    }
  };

  const formatTimeAgo = (isoString) => {
    if (!isoString) return 'Today';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch (e) {
      return 'Recently';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.bellIconBg}>
                <Ionicons name="notifications" size={18} color={colors.primaryDark} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Notifications</Text>
                <Text style={styles.headerSubtitle}>Fee deadlines & member alerts</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Notifications List */}
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="notifications-off-outline" size={36} color={colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                <Text style={styles.emptyText}>
                  You have no pending fee deadlines or reminders right now.
                </Text>
              </View>
            ) : (
              notifications.map((item) => {
                const iconInfo = getIconForType(item.type);
                const isFeeRelated =
                  item.type === 'fee_deadline' ||
                  item.type === 'expired';

                return (
                  <View key={item.id} style={styles.notificationCard}>
                    <View style={styles.cardTopRow}>
                      <View style={[styles.typeIconBox, { backgroundColor: iconInfo.bg }]}>
                        <Ionicons name={iconInfo.name} size={16} color={iconInfo.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.notifTitle}>{item.title}</Text>
                        <Text style={styles.timeText}>{formatTimeAgo(item.timestamp)}</Text>
                      </View>
                    </View>

                    <Text style={styles.notifMessage}>{item.message}</Text>

                    {isFeeRelated && onPayPress ? (
                      <TouchableOpacity
                        style={styles.payNowBtn}
                        onPress={() => {
                          onClose();
                          onPayPress();
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="card-outline" size={14} color={colors.white} />
                        <Text style={styles.payNowBtnText}>Pay / Submit Fee Proof</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Footer Actions */}
          {notifications.length > 0 && onClearAll ? (
            <View style={styles.footer}>
              <TouchableOpacity
                onPress={onClearAll}
                style={styles.clearBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                <Text style={styles.clearBtnText}>Clear All Alerts</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  notificationCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.soft,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  typeIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  timeText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  notifMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  payNowBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
});

export default NotificationModal;
