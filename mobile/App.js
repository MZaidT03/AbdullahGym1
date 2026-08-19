import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider } from './src/context/AuthContext';
import { DialogProvider } from './src/context/DialogContext';
import AppNavigator from './src/navigation/AppNavigator';

// Web Vector Icons Font Face Injector
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const iconFontStyles = `
    @font-face {
      font-family: 'ionicons';
      src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype'),
           url('https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Ionicons';
      src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype'),
           url('https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.ttf') format('truetype');
    }
  `;

  const styleId = 'expo-vector-icons-web-fonts';
  if (!document.getElementById(styleId)) {
    const styleTag = document.createElement('style');
    styleTag.id = styleId;
    styleTag.type = 'text/css';
    styleTag.appendChild(document.createTextNode(iconFontStyles));
    document.head.appendChild(styleTag);
  }
}

export default function App() {
  const [fontsLoaded] = useFonts({
    ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
    Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
  });

  return (
    <SafeAreaProvider>
      <DialogProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </DialogProvider>
    </SafeAreaProvider>
  );
}
