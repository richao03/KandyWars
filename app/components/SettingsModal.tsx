import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import colors from '../../src/constants/colors';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { updateCachedUserObject } from '../../src/store/slices/userObjectSlice';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import PressableButton from './PressableButton';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({
  visible,
  onClose,
}: SettingsModalProps) {
  const dispatch = useAppDispatch();
  const cachedUser = useAppSelector((state) => state.userObject.cachedUser);
  const [playerName, setPlayerName] = useState(cachedUser?.playerName || 'Player');

  const handleSave = () => {
    // Update Redux cache with new player name
    dispatch(updateCachedUserObject({ playerName: playerName.trim() || 'Player' }));
    if (__DEV__) console.log('✅ Player name updated locally:', playerName);
    onClose();
  };

  return (
    <FastModal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <PixelBorder
          borderColor="#FFB6D9"
          borderWidth={4}
          backgroundColor="rgba(255, 250, 245, 0.98)"
          innerPadding={24}
          style={styles.content}
        >
          <Text style={styles.title}>⚙️ Settings</Text>

          <View style={styles.section}>
            <Text style={styles.label}>Player Name</Text>
            <PixelBorder
              borderColor="#B5E7E3"
              borderWidth={3}
              backgroundColor="white"
              innerPadding={0}
              style={styles.inputBorder}
            >
              <TextInput
                style={styles.input}
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="Enter your name"
                maxLength={20}
                autoCapitalize="words"
              />
            </PixelBorder>
            <Text style={styles.hint}>
              This name will appear on the leaderboard when you complete a game.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <PressableButton
              onPress={handleSave}
              shadowColor="#8a2d5a"
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.4}
              shadowRadius={5}
              elevation={8}
              style={styles.button}
            >
              <PixelBorder
                borderColor="#A8E6A1"
                borderWidth={3}
                backgroundColor="#B8F0B2"
                innerPadding={0}
              >
                <View style={styles.buttonInner}>
                  <Text style={styles.buttonText}>Save</Text>
                </View>
              </PixelBorder>
            </PressableButton>

            <PressableButton
              onPress={onClose}
              shadowColor="#5a2d5a"
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.4}
              shadowRadius={5}
              elevation={8}
              style={styles.button}
            >
              <PixelBorder
                borderColor="#ccc"
                borderWidth={3}
                backgroundColor="#e0e0e0"
                innerPadding={0}
              >
                <View style={styles.buttonInner}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </View>
              </PixelBorder>
            </PressableButton>
          </View>
        </PixelBorder>
      </View>
    </FastModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D946A6',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'PixeloidMono',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D9B99',
    marginBottom: 8,
    fontFamily: 'PixeloidMono',
  },
  inputBorder: {
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    padding: 12,
    fontFamily: 'PixeloidMono',
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'PixeloidMono',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
  buttonInner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
});
