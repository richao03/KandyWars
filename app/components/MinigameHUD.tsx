import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ResponsiveSpacing } from '../../src/utils/responsive';

interface MinigameHUDProps {
  title: string;
  subtitle?: string;
  leftInfo?: string;
  rightInfo?: string;
  centerInfo?: string;
  theme?: 'math' | 'computer' | 'logic' | 'history' | 'homeec' | 'gym' | 'economy' | 'recess';
}

const THEME_COLORS = {
  math: {
    background: '#0d2818', // Very dark chalkboard green
    border: '#f5f5dc', // Chalk-colored border
    title: '#f5f5dc', // Chalk white/cream for title
    subtitle: '#ffd700', // Golden yellow for subtitle
    info: '#f5f5dc', // Chalk white/cream for info
  },
  computer: {
    background: '#0a0e1a',
    border: '#1a2332',
    title: '#87ceeb',
    subtitle: '#98fb98',
    info: '#52c41a',
  },
  logic: {
    background: '#2c2c2c',
    border: '#3c3c3c',
    title: '#87ceeb',
    subtitle: '#98fb98',
    info: '#52c41a',
  },
  history: {
    background: '#f5f5dc',
    border: '#DEB887',
    title: '#DEB887',
    subtitle: '#F4A460',
    info: '#8B4513',
  },
  homeec: {
    background: '#2c3139',
    border: '#495057',
    title: '#f8f9fa',
    subtitle: '#6c757d',
    info: '#28a745',
  },
  gym: {
    background: '#2c3e50', // Dark gym blue-gray to match game background
    border: '#e74c3c', // Gym red border
    title: '#f39c12', // Gym gold for title
    subtitle: '#ecf0f1', // Light gray for subtitle
    info: '#e74c3c', // Gym red for info text
  },
  economy: {
    background: '#1e3a8a', // Deep blue matching game header
    border: '#64b5f6', // Light blue border from game
    title: '#64b5f6', // Light blue for title
    subtitle: '#bbdefb', // Lighter blue for subtitle
    info: '#ffeb3b', // Yellow accent for info (matching level text)
  },
  recess: {
    background: '#fff', // White background
    border: '#4A90C1', // Blue border matching game elements
    title: '#4A90C1', // Blue for title (from choice text/borders)
    subtitle: '#4CAF50', // Green for subtitle (from win text)
    info: '#4A90C1', // Blue for info text
  },
};

export default function MinigameHUD({
  title,
  subtitle,
  leftInfo,
  rightInfo,
  centerInfo,
  theme = 'math',
}: MinigameHUDProps) {
  const colors = THEME_COLORS[theme];

  return (
    <View style={[styles.header, {
      backgroundColor: colors.background,
      borderColor: colors.border,
      marginBottom: ResponsiveSpacing.headerMargin(),
      padding: ResponsiveSpacing.headerPadding(),
    }]}>
      <Text style={[styles.title, {
        color: colors.title,
        fontSize: ResponsiveSpacing.titleSize(),
        marginBottom: ResponsiveSpacing.inputMargin(),
      }]}>
        {title}
      </Text>
      
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          {subtitle}
        </Text>
      )}
      
      {(leftInfo || rightInfo || centerInfo) && (
        <View style={styles.gameInfo}>
          {leftInfo && (
            <Text style={[styles.infoText, { color: colors.info }]}>
              {leftInfo}
            </Text>
          )}
          {centerInfo && (
            <Text style={[styles.infoText, { color: colors.info }]}>
              {centerInfo}
            </Text>
          )}
          {rightInfo && (
            <Text style={[styles.infoText, { color: colors.info }]}>
              {rightInfo}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 16,
  },
  gameInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 20,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PixeloidMono',
    flex: 1,
    textAlign: 'center',
  },
});