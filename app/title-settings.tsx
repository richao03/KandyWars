import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTutorial } from '../src/context/TutorialContext';
import ConfirmationModal from './components/ConfirmationModal';

export default function TitleSettings() {
  const { resetAllTutorials, tutorialEnabled, setTutorialEnabled } = useTutorial();

  const [isResetting, setIsResetting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirmModal = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      visible: true,
      title,
      message,
      onConfirm,
    });
  };

  const hideConfirmModal = () => {
    setConfirmModal({
      visible: false,
      title: '',
      message: '',
      onConfirm: () => {},
    });
  };

  const handleResetAllData = async () => {
    showConfirmModal(
      'Reset All Data',
      'This will permanently delete ALL your game data including:\n\n• All saved games\n• Player names\n• Tutorial progress\n• Settings\n\nThis action cannot be undone. Are you sure?',
      async () => {
        try {
          setIsResetting(true);
          console.log('🗑️ Starting complete data reset...');

          // Clear all AsyncStorage data
          await AsyncStorage.clear();

          // Reset tutorial context
          resetAllTutorials();

          console.log('✅ All data cleared successfully');

          Alert.alert(
            'Data Reset Complete',
            'All game data has been permanently deleted. The app will now restart.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Navigate back to title screen
                  router.replace('/title-screen');
                },
              },
            ]
          );
        } catch (error) {
          console.error('❌ Error during data reset:', error);
          Alert.alert('Error', 'Failed to reset data. Please try again.');
        } finally {
          setIsResetting(false);
          hideConfirmModal();
        }
      }
    );
  };

  const handleResetTutorials = () => {
    showConfirmModal(
      'Reset Tutorials',
      'This will reset all tutorial progress. You will see tutorials again when you start playing.',
      () => {
        resetAllTutorials();
        hideConfirmModal();
        Alert.alert('Tutorials Reset', 'All tutorial progress has been reset.');
      }
    );
  };

  const toggleTutorials = () => {
    setTutorialEnabled(!tutorialEnabled);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#1a1a1a"
        translucent={true}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tutorial Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Tutorial Settings</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={toggleTutorials}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingTitle}>Enable Tutorials</Text>
              <Text style={styles.settingDescription}>
                Show helpful tutorials when playing the game
              </Text>
            </View>
            <View style={[
              styles.toggle,
              tutorialEnabled ? styles.toggleOn : styles.toggleOff
            ]}>
              <Text style={styles.toggleText}>
                {tutorialEnabled ? 'ON' : 'OFF'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleResetTutorials}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingTitle}>Reset Tutorials</Text>
              <Text style={styles.settingDescription}>
                Reset all tutorial progress to see them again
              </Text>
            </View>
            <Text style={styles.actionText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗂️ Data Management</Text>

          <TouchableOpacity
            style={[styles.settingItem, styles.dangerItem]}
            onPress={handleResetAllData}
            disabled={isResetting}
          >
            <View style={styles.settingLeft}>
              <Text style={[styles.settingTitle, styles.dangerText]}>
                Reset All Data
              </Text>
              <Text style={styles.settingDescription}>
                Permanently delete all game data and settings
              </Text>
            </View>
            {isResetting ? (
              <ActivityIndicator size="small" color="#ff4444" />
            ) : (
              <Text style={[styles.actionText, styles.dangerText]}>Delete</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ About</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoTitle}>Candy Warz</Text>
            <Text style={styles.infoDescription}>
              A strategic candy trading game where you manage debt,
              buy and sell candy, and collect powerful jokers to succeed.
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoTitle}>Version</Text>
            <Text style={styles.infoDescription}>1.0.0</Text>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 50 }} />
      </ScrollView>

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={hideConfirmModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  backButton: {
    padding: 8,
    width: 80,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  settingLeft: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#9ca3af',
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 50,
    alignItems: 'center',
  },
  toggleOn: {
    backgroundColor: '#22c55e',
  },
  toggleOff: {
    backgroundColor: '#6b7280',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  dangerItem: {
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  dangerText: {
    color: '#ff4444',
  },
  infoItem: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
});