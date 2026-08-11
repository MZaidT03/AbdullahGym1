import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import colors from '../constants/colors';

export const SplashScreen = ({ navigation }) => {
  const { isAuthenticated, isLoading } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      if (!isLoading) {
        if (isAuthenticated) {
          navigation.replace('MainApp');
        } else {
          navigation.replace('Login');
        }
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoCircle}>
          <Ionicons name="barbell" size={48} color={colors.white} />
        </View>
        <Text style={styles.title}>Abdullah Gym 1</Text>
        <Text style={styles.tagline}>Your fitness. Your progress.</Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.pulseDot} />
        <Text style={styles.footerText}>MEMBERS APP</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
});

export default SplashScreen;
