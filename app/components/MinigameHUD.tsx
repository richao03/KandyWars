import colors from '@/src/constants/colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ResponsiveSpacing } from '../../src/utils/responsive';
import PixelBorder from './PixelBorder';
import TextWithEmojis from './TextWithEmojis';

interface MinigameHUDProps {
  title: string;
  subtitle?: string;
  leftInfo?: string;
  rightInfo?: string;
  centerInfo?: string;
  theme?:
    | 'math'
    | 'computer'
    | 'logic'
    | 'history'
    | 'homeec'
    | 'gym'
    | 'economy'
    | 'recess'
    | 'geography'
    | 'art'
    | 'nim';
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
    background: '#404040',
    border: '#666',
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
    background: '#7fc69e', // Strawberry pink
    border: colors.offWhite, // brown
    title: colors.offWhite,
    subtitle: '#5d3a1a', // brown
    info: colors.offWhite,
  },
  gym: {
    background: '#d4c5a9', // Warm beige desk
    border: '#8B7355', // Wood brown border
    title: '#5c4a32', // Dark wood title
    subtitle: '#6B5B45', // Medium brown subtitle
    info: '#5c4a32', // Dark wood info
  },
  economy: {
    background: '#558060', // Mid US-bill green — distinctly lighter than math chalkboard
    border: '#daa520', // Gold accent border
    title: '#f5e6c8', // Cream — like bill paper
    subtitle: '#daf0c4', // Pale green
    info: '#ffd700', // Bright gold for info (level/score)
    fontSize: 12,
  },
  recess: {
    background: '#fff', // White background
    border: '#4A90C1', // Blue border matching game elements
    title: '#4A90C1', // Blue for title (from choice text/borders)
    subtitle: '#4CAF50', // Green for subtitle (from win text
    info: '#4A90C1', // Blue for info text
  },
  geography: {
    background: '#f4e8d0', // Ocean blue — globes are mostly water
    border: '#c89968', // Tan / continent edge
    title: '#7a9c5a', // Land green
    subtitle: '#c89968', // Tan / continent edge
    info: '#7a9c5a', // Land green
  },
  art: {
    background: '#000000', // Pure black — neutral canvas so puzzle colors pop
    border: '#ffffff', // White border
    title: '#ffffff', // White title
    subtitle: '#888888', // Single neutral gray for subtitle
    info: '#ffffff', // White info
  },
  nim: {
    background: '#c4b596', // Warm parchment — matches NimGame container
    border: '#8B7355', // Wood brown
    title: '#5c4a32', // Dark wood title
    subtitle: '#6B5B45', // Medium brown subtitle
    info: '#8b4513', // Saddle brown for info
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
    <PixelBorder
      borderColor={colors.border}
      borderWidth={3}
      backgroundColor={colors.background}
      innerPadding={ResponsiveSpacing.headerPadding()}
      style={{
        marginBottom: ResponsiveSpacing.headerMargin(),
      }}
    >
      <View style={styles.headerContent}>
        <TextWithEmojis
          style={[
            styles.title,
            {
              color: colors.title,
              fontSize: ResponsiveSpacing.titleSize(),
              marginBottom: ResponsiveSpacing.inputMargin(),
            },
          ]}
        >
          {title}
        </TextWithEmojis>

        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.subtitle }]}>
            {subtitle}
          </Text>
        )}

        {(leftInfo || rightInfo || centerInfo) && (
          <View style={styles.gameInfo}>
            {leftInfo && (
              <TextWithEmojis
                style={[styles.infoText, { color: colors.info, fontSize: 14 }]}
              >
                {leftInfo}
              </TextWithEmojis>
            )}
            {centerInfo && (
              <View style={{ width: '30%' }}>
                <TextWithEmojis
                  imageSize={18}
                  style={[
                    styles.infoText,
                    { color: colors.info, fontSize: 14 },
                  ]}
                >
                  {centerInfo}
                </TextWithEmojis>
              </View>
            )}
            {rightInfo && (
              <View style={{ width: '30%' }}>
                <TextWithEmojis
                  imageSize={30}
                  style={[
                    styles.infoText,
                    { color: colors.info, fontSize: 14 },
                  ]}
                >
                  {rightInfo}
                </TextWithEmojis>
              </View>
            )}
          </View>
        )}
      </View>
    </PixelBorder>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    alignItems: 'center',
    backgroundColor: 'transparent',
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
