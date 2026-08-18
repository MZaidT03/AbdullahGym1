import React, { createContext, useContext, useState } from 'react';
import CustomDialog from '../components/CustomDialog';

const DialogContext = createContext();

export const DialogProvider = ({ children }) => {
  const [dialogConfig, setDialogConfig] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    icon: null,
    confirmText: 'OK',
    cancelText: 'Cancel',
    confirmStyle: 'primary',
    showCancel: false,
    onConfirm: null,
    onCancel: null,
  });

  const showDialog = (options = {}) => {
    setDialogConfig({
      visible: true,
      type: options.type || 'info',
      title: options.title || '',
      message: options.message || '',
      icon: options.icon || null,
      confirmText: options.confirmText || 'OK',
      cancelText: options.cancelText || 'Cancel',
      confirmStyle: options.confirmStyle || 'primary',
      showCancel: !!options.showCancel || options.type === 'confirm',
      onConfirm: options.onConfirm || null,
      onCancel: options.onCancel || null,
    });
  };

  const showAlert = (titleOrOptions, message, type = 'info') => {
    if (typeof titleOrOptions === 'object') {
      showDialog({ type: 'info', ...titleOrOptions });
    } else {
      showDialog({
        title: titleOrOptions,
        message,
        type,
        confirmText: 'OK',
      });
    }
  };

  const showConfirm = ({
    title = 'Are you sure?',
    message = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmStyle = 'primary',
    type = 'confirm',
    onConfirm,
    onCancel,
  }) => {
    showDialog({
      title,
      message,
      confirmText,
      cancelText,
      confirmStyle,
      type,
      showCancel: true,
      onConfirm,
      onCancel,
    });
  };

  const hideDialog = () => {
    setDialogConfig((prev) => ({ ...prev, visible: false }));
  };

  return (
    <DialogContext.Provider value={{ showDialog, showAlert, showConfirm, hideDialog }}>
      {children}
      <CustomDialog
        {...dialogConfig}
        onClose={hideDialog}
      />
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

export default DialogContext;
