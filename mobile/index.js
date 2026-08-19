import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import { markLoaded } from 'expo-font/build/memory';

// Synchronously inject vector icon font-faces on web and prime the cache
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // Prime expo-font cache so createIconSet renders glyphs immediately
  const iconFamilies = [
    'ionicons',
    'Ionicons',
    'MaterialCommunityIcons',
    'MaterialIcons',
    'FontAwesome',
    'FontAwesome5',
    'FontAwesome6',
    'Feather',
    'AntDesign',
    'Entypo',
    'SimpleLineIcons',
    'Octicons',
  ];
  iconFamilies.forEach((f) => {
    try {
      markLoaded(f);
    } catch (e) {}
  });

  const iconFontStyles = `
    @font-face {
      font-family: ionicons;
      src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype'),
           url('https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.ttf') format('truetype');
      font-display: swap;
    }
    @font-face {
      font-family: Ionicons;
      src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype'),
           url('https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.ttf') format('truetype');
      font-display: swap;
    }
    @font-face {
      font-family: MaterialCommunityIcons;
      src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf') format('truetype');
      font-display: swap;
    }
    @font-face {
      font-family: FontAwesome;
      src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf') format('truetype');
      font-display: swap;
    }
  `;

  let styleTag = document.getElementById('expo-generated-fonts');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'expo-generated-fonts';
    styleTag.type = 'text/css';
    document.head.appendChild(styleTag);
  }
  try {
    styleTag.appendChild(document.createTextNode(iconFontStyles));
  } catch (e) {}
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
