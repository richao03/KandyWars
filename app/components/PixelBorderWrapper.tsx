import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { GamePixelBorder, GamePixelButton, GamePixelCard } from './GamePixelBorder';

/**
 * Helper components to make migration easier
 * These are drop-in replacements for common patterns
 */

// Drop-in replacement for section containers
export const PixelSection: React.FC<{
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
}> = ({ children, title, style }) => {
  return (
    <GamePixelCard
      borderColor="#d4a574"
      backgroundColor="rgba(255, 255, 255, 0.8)"
      style={style}
    >
      {title && <Text style={sectionTitleStyle}>{title}</Text>}
      {children}
    </GamePixelCard>
  );
};

// Drop-in replacement for primary buttons
export const PixelPrimaryButton: React.FC<{
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
}> = ({ onPress, children, disabled, style }) => {
  return (
    <GamePixelButton
      borderColor="#3b82f6"
      backgroundColor="#dbeafe"
      textColor="#1d4ed8"
      onPress={onPress}
      disabled={disabled}
      style={style}
    >
      {children}
    </GamePixelButton>
  );
};

// Drop-in replacement for danger buttons
export const PixelDangerButton: React.FC<{
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
}> = ({ onPress, children, disabled, style }) => {
  return (
    <GamePixelButton
      borderColor="#ef4444"
      backgroundColor="#fee2e2"
      textColor="#dc2626"
      onPress={onPress}
      disabled={disabled}
      style={style}
    >
      {children}
    </GamePixelButton>
  );
};

// Drop-in replacement for success buttons
export const PixelSuccessButton: React.FC<{
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
}> = ({ onPress, children, disabled, style }) => {
  return (
    <GamePixelButton
      borderColor="#22c55e"
      backgroundColor="#d4f6d4"
      textColor="#166534"
      onPress={onPress}
      disabled={disabled}
      style={style}
    >
      {children}
    </GamePixelButton>
  );
};

// Drop-in replacement for modal content
export const PixelModalContent: React.FC<{
  children: React.ReactNode;
  style?: ViewStyle;
}> = ({ children, style }) => {
  return (
    <GamePixelCard
      borderColor="#d4a574"
      backgroundColor="white"
      style={style}
    >
      {children}
    </GamePixelCard>
  );
};

// Drop-in replacement for input fields
export const PixelInputWrapper: React.FC<{
  children: React.ReactNode;
  style?: ViewStyle;
  error?: boolean;
}> = ({ children, style, error = false }) => {
  return (
    <GamePixelBorder
      borderColor={error ? "#ef4444" : "#d4a574"}
      backgroundColor="#fef7e7"
      style={style}
    >
      {children}
    </GamePixelBorder>
  );
};

// Drop-in replacement for list items
export const PixelListItem: React.FC<{
  onPress?: () => void;
  children: React.ReactNode;
  selected?: boolean;
  style?: ViewStyle;
}> = ({ onPress, children, selected = false, style }) => {
  const content = (
    <GamePixelBorder
      borderColor={selected ? "#3b82f6" : "#e5e7eb"}
      backgroundColor={selected ? "#eff6ff" : "#ffffff"}
      style={style}
    >
      {children}
    </GamePixelBorder>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// Drop-in replacement for tab buttons
export const PixelTabButton: React.FC<{
  onPress: () => void;
  active: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}> = ({ onPress, active, children, style }) => {
  return (
    <GamePixelButton
      borderColor={active ? "#3b82f6" : "#9ca3af"}
      backgroundColor={active ? "#dbeafe" : "#f3f4f6"}
      textColor={active ? "#1d4ed8" : "#4b5563"}
      onPress={onPress}
      style={style}
    >
      {children}
    </GamePixelButton>
  );
};

const sectionTitleStyle: TextStyle = {
  fontSize: 20,
  fontWeight: '700',
  color: '#6b4423',
  marginBottom: 15,
  fontFamily: 'PixeloidMono',
};

export default {
  PixelSection,
  PixelPrimaryButton,
  PixelDangerButton,
  PixelSuccessButton,
  PixelModalContent,
  PixelInputWrapper,
  PixelListItem,
  PixelTabButton,
};