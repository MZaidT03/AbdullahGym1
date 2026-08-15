import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import colors from '../constants/colors';

export const SplashScreen = ({ navigation }) => {
  const { isAuthenticated, isLoading } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.82)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Parallel Entrance Animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: false,
      }),
    ]).start();

    // Subtle Continuous Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const timer = setTimeout(() => {
      if (!isLoading) {
        if (isAuthenticated) {
          navigation.replace('MainApp');
        } else {
          navigation.replace('Login');
        }
      }
    }, 1900);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F1D" />

      {/* Subtle Background Glow Rings */}
      <View style={styles.bgGlowRing1} />
      <View style={styles.bgGlowRing2} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Animated Glowing Logo Badge */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={styles.logoOuterRing}>
            <View style={styles.logoInnerCircle}>
              <Ionicons name="barbell" size={46} color={colors.white} />
            </View>
          </View>
        </Animated.View>

        {/* Brand Typography */}
        <Text style={styles.brandTitle}>ABDULLAH GYM 1</Text>
        <View style={styles.tagBadge}>
          <Text style={styles.tagBadgeText}>PREMIUM FITNESS CLUB</Text>
        </View>
        <Text style={styles.tagline}>Elevate Your Strength & Performance</Text>
      </Animated.View>

      {/* Bottom Loading Progress Indicator */}
      <View style={styles.footer}>
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
        </View>

        <View style={styles.footerLabelRow}>
          <View style={styles.pulseDot} />
          <Text style={styles.footerText}>OFFICIAL MEMBER PORTAL</Text>
        </View>

        <Text style={styles.poweredByText}>
          Powered By CodeInn' Tech | contact@codeinntech.com
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1D', // Deep luxury slate black
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bgGlowRing1: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(22, 196, 91, 0.08)',
  },
  bgGlowRing2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(22, 196, 91, 0.12)',
  },
  content: {
    alignItems: 'center',
    zIndex: 2,
  },
  logoWrapper: {
    marginBottom: 24,
  },
  logoOuterRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(22, 196, 91, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(22, 196, 91, 0.5)',
  },
  logoInnerCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  tagBadge: {
    backgroundColor: 'rgba(22, 196, 91, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(22, 196, 91, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.4,
  },
  footer: {
    position: 'absolute',
    bottom: 36,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 30,
    zIndex: 2,
  },
  progressBarTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  footerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.2,
  },
  poweredByText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 0.3,
    marginTop: 4,
  },
});

export default SplashScreen;
