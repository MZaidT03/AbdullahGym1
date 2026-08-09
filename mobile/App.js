import React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { theme } from './theme';

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Outer Frame Container */}
        <View style={styles.frameContainer}>
          
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.badgeDot} />
            <Text style={styles.headerTitle}>{theme.name}</Text>
          </View>

          {/* SECTION 1: COLOR PALETTE SWATCHES */}
          <Text style={styles.sectionHeading}>Color Palettes</Text>

          {/* Primary Swatch */}
          <View style={styles.card}>
            <View style={[styles.swatchHeader, { backgroundColor: theme.colors.primary.hex }]}>
              <Text style={styles.swatchTitle}>Primary</Text>
              <Text style={styles.swatchHex}>#22C55E</Text>
            </View>
            <View style={styles.shadeBar}>
              {theme.colors.primary.shades.map((hex, i) => (
                <View key={i} style={[styles.shadeSegment, { backgroundColor: hex }]} />
              ))}
            </View>
          </View>

          {/* Secondary Swatch */}
          <View style={styles.card}>
            <View style={[styles.swatchHeader, { backgroundColor: theme.colors.secondary.hex }]}>
              <Text style={styles.swatchTitle}>Secondary</Text>
              <Text style={styles.swatchHex}>#2563EB</Text>
            </View>
            <View style={styles.shadeBar}>
              {theme.colors.secondary.shades.map((hex, i) => (
                <View key={i} style={[styles.shadeSegment, { backgroundColor: hex }]} />
              ))}
            </View>
          </View>

          {/* Tertiary Swatch */}
          <View style={styles.card}>
            <View style={[styles.swatchHeader, { backgroundColor: theme.colors.tertiary.hex }]}>
              <Text style={styles.swatchTitle}>Tertiary</Text>
              <Text style={styles.swatchHex}>#F59E0B</Text>
            </View>
            <View style={styles.shadeBar}>
              {theme.colors.tertiary.shades.map((hex, i) => (
                <View key={i} style={[styles.shadeSegment, { backgroundColor: hex }]} />
              ))}
            </View>
          </View>

          {/* Neutral Swatch */}
          <View style={styles.card}>
            <View style={[styles.swatchHeader, { backgroundColor: theme.colors.neutral.hex }]}>
              <Text style={styles.swatchTitle}>Neutral</Text>
              <Text style={styles.swatchHex}>#71796F</Text>
            </View>
            <View style={styles.shadeBar}>
              {theme.colors.neutral.shades.map((hex, i) => (
                <View key={i} style={[styles.shadeSegment, { backgroundColor: hex }]} />
              ))}
            </View>
          </View>

          {/* SECTION 2: TYPOGRAPHY SPECIMENS */}
          <Text style={styles.sectionHeading}>Typography</Text>
          
          <View style={styles.gridTwo}>
            <View style={[styles.card, styles.typoCard]}>
              <View style={styles.typoHeader}>
                <Text style={styles.typoLabel}>Headline</Text>
                <Text style={styles.typoFont}>Inter</Text>
              </View>
              <Text style={styles.typoSpecimenLight}>Aa</Text>
            </View>

            <View style={[styles.card, styles.typoCard]}>
              <View style={styles.typoHeader}>
                <Text style={styles.typoLabel}>Body</Text>
                <Text style={styles.typoFont}>Inter</Text>
              </View>
              <Text style={styles.typoSpecimenRegular}>Aa</Text>
            </View>
          </View>

          <View style={[styles.card, styles.typoCard, { marginTop: 10 }]}>
            <View style={styles.typoHeader}>
              <Text style={styles.typoLabel}>Label</Text>
              <Text style={styles.typoFont}>Inter</Text>
            </View>
            <Text style={styles.typoSpecimenBold}>Aa</Text>
          </View>

          {/* SECTION 3: BUTTON VARIANTS */}
          <Text style={styles.sectionHeading}>Button Variants</Text>

          <View style={styles.gridTwo}>
            <TouchableOpacity style={styles.btnPrimary}>
              <Text style={styles.btnPrimaryText}>Primary</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSecondary}>
              <Text style={styles.btnSecondaryText}>Secondary</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.gridTwo, { marginTop: 10 }]}>
            <TouchableOpacity style={styles.btnInverted}>
              <Text style={styles.btnInvertedText}>Inverted</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnOutlined}>
              <Text style={styles.btnOutlinedText}>Outlined</Text>
            </TouchableOpacity>
          </View>

          {/* SECTION 4: PROGRESS BARS & SEARCH */}
          <Text style={styles.sectionHeading}>Controls & Search</Text>

          {/* Search Input */}
          <View style={styles.card}>
            <View style={styles.searchInputContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search"
                placeholderTextColor="#646C64"
              />
            </View>
          </View>

          {/* Progress Bars */}
          <View style={[styles.card, styles.progressCard]}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { backgroundColor: '#0B6634', width: '65%' }]} />
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { backgroundColor: '#2563EB', width: '80%' }]} />
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { backgroundColor: '#B45309', width: '50%' }]} />
            </View>
          </View>

          {/* SECTION 5: FLOATING NAV & ACTION BUTTONS */}
          <Text style={styles.sectionHeading}>Navigation & Badges</Text>

          {/* Navigation Pill */}
          <View style={[styles.card, styles.navCard]}>
            <View style={styles.navPill}>
              <TouchableOpacity style={styles.navActiveItem}>
                <Text style={styles.navActiveText}>🏠</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem}>
                <Text style={styles.navText}>🔍</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navItem}>
                <Text style={styles.navText}>👤</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.circleAction, { backgroundColor: '#0B6634' }]}>
              <Text style={styles.actionIcon}>🪄</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.circleAction, { backgroundColor: '#2563EB' }]}>
              <Text style={styles.actionIcon}>🔷</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.circleAction, { backgroundColor: '#B45309' }]}>
              <Text style={styles.actionIcon}>🏷️</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.circleAction, { backgroundColor: '#DC2626' }]}>
              <Text style={styles.actionIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0d110f',
  },
  scrollContent: {
    padding: 16,
    alignItems: 'center',
  },
  frameContainer: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#E4EAE1',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E2922',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#626E64',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#E8EEE5',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D2DCD0',
  },
  swatchHeader: {
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  swatchTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  swatchHex: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Platform',
    fontSize: 12,
  },
  shadeBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 6,
    overflow: 'hidden',
  },
  shadeSegment: {
    flex: 1,
  },
  gridTwo: {
    flexDirection: 'row',
    gap: 10,
  },
  typoCard: {
    flex: 1,
    height: 110,
    justifyContent: 'space-between',
  },
  typoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typoLabel: {
    fontSize: 11,
    color: '#5C655E',
    fontWeight: '500',
  },
  typoFont: {
    fontSize: 11,
    color: '#5C655E',
  },
  typoSpecimenLight: {
    fontSize: 48,
    fontWeight: '300',
    color: '#1A261C',
  },
  typoSpecimenRegular: {
    fontSize: 48,
    fontWeight: '400',
    color: '#1A261C',
  },
  typoSpecimenBold: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1A261C',
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#0B6634',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#D5E0D2',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#1E2922',
    fontSize: 12,
    fontWeight: '700',
  },
  btnInverted: {
    flex: 1,
    backgroundColor: '#242D26',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnInvertedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnOutlined: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#BDC7BA',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnOutlinedText: {
    color: '#1E2922',
    fontSize: 12,
    fontWeight: '700',
  },
  searchInputContainer: {
    backgroundColor: '#DBE4D7',
    borderWidth: 1,
    borderColor: '#C5D0C1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1E2922',
  },
  progressCard: {
    gap: 10,
    paddingVertical: 16,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#D5E0D2',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  navCard: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  navPill: {
    backgroundColor: '#D5E0D2',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  navActiveItem: {
    backgroundColor: '#0B6634',
    padding: 8,
    borderRadius: 20,
  },
  navActiveText: {
    fontSize: 14,
  },
  navItem: {
    padding: 4,
  },
  navText: {
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  circleAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 16,
  },
});
