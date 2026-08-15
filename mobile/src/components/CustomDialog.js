import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import theme from '../constants/theme';

export const CustomDialog = ({
  visible = false,
  type = 'info', // 'success' | 'danger' | 'warning' | 'info' | 'confirm' | 'deactivated'
  title = '',
  message = '',
  icon,
  confirmText = 'OK',
  cancelText = 'Cancel',
  confirmStyle = 'primary', // 'primary' | 'danger' | 'warning'
  showCancel = false,
  onConfirm,
  onCancel,
  onClose,
}) => {
  if (!visible) return null;

  const isConfirmMode = showCancel || type === 'confirm';

  const getThemeDetails = () => {
    switch (type) {
      case 'success':
        return {
          iconName: icon || 'checkmark-circle',
          iconColor: '#10B981',
          bgColor: 'rgba(16, 185, 129, 0.12)',
          borderColor: '#10B981',
          btnBg: colors.primary,
        };
      case 'danger':
        return {
          iconName: icon || 'alert-circle',
          iconColor: '#EF4444',
          bgColor: 'rgba(239, 68, 68, 0.12)',
          borderColor: '#EF4444',
          btnBg: '#EF4444',
        };
      case 'warning':
        return {
          iconName: icon || 'warning',
          iconColor: '#F59E0B',
          bgColor: 'rgba(245, 158, 11, 0.12)',
          borderColor: '#F59E0B',
          btnBg: '#F59E0B',
        };
      case 'deactivated':
        return {
          iconName: icon || 'lock-closed',
          iconColor: '#DC2626',
          bgColor: 'rgba(220, 38, 38, 0.15)',
          borderColor: '#DC2626',
          btnBg: '#DC2626',
        };
      case 'info':
      case 'confirm':
      default:
        return {
          iconName: icon || (isConfirmMode ? 'help-circle' : 'information-circle'),
          iconColor: colors.primary,
          bgColor: 'rgba(22, 196, 91, 0.12)',
          borderColor: colors.primary,
          btnBg: confirmStyle === 'danger' ? '#EF4444' : colors.primary,
        };
    }
  };

  const themeConfig = getThemeDetails();

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    if (onClose) onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    if (onClose) onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.dialogCard}>
              {/* Top Accent Icon Badge */}
              <View style={[styles.iconCircle, { backgroundColor: themeConfig.bgColor }]}>
                <Ionicons name={themeConfig.iconName} size={36} color={themeConfig.iconColor} />
              </View>

              {/* Title & Message */}
              <Text style={styles.titleText}>{title}</Text>
              {message ? <Text style={styles.messageText}>{message}</Text> : null}

              {/* Buttons Row */}
              <View style={styles.buttonRow}>
                {isConfirmMode && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    activeOpacity={0.75}
                    onPress={handleCancel}
                  >
                    <Text style={styles.cancelButtonText}>{cancelText}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    { backgroundColor: themeConfig.btnBg },
                    !isConfirmMode && styles.fullWidthButton,
                  ]}
                  activeOpacity={0.8}
                  onPress={handleConfirm}
                >
                  <Text style={styles.confirmButtonText}>{confirmText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...theme.shadows.card,
    elevation: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  fullWidthButton: {
    flex: 1,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
  },
});

export default CustomDialog;
