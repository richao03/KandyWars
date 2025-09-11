import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { nameValidationService } from '../../src/services/nameValidationService';

interface NamePromptModalProps {
  visible: boolean;
  onSubmitName: (name: string) => void;
  onSkip: () => void;
}

export default function NamePromptModal({
  visible,
  onSubmitName,
  onSkip,
}: NamePromptModalProps) {
  const [name, setName] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      Alert.alert(
        'Invalid Name',
        'Please enter a valid name or skip this step.'
      );
      return;
    }

    if (trimmedName.length > 20) {
      Alert.alert(
        'Name Too Long',
        'Please enter a name with 20 characters or less.'
      );
      return;
    }

    // Validate name uniqueness
    setIsValidating(true);
    setValidationError(null);

    try {
      const isAvailable =
        await nameValidationService.isNameAvailable(trimmedName);

      if (!isAvailable) {
        setValidationError(
          'This name is already taken. Please choose a different name.'
        );

        // Get suggested alternatives
        const suggestions =
          await nameValidationService.getSuggestedNames(trimmedName);
        setIsValidating(false);
        return;
      }

      // Name is available, proceed
      setValidationError(null);
      onSubmitName(trimmedName);
      setName(''); // Reset for next time
    } catch (error) {
      console.error('Error validating name:', error);
      Alert.alert(
        'Validation Error',
        'Unable to check name availability. Please try again.'
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleSkip = () => {
    onSkip();
    setName(''); // Reset for next time
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.subtitle}>What's your name?</Text>

          <TextInput
            style={[styles.textInput, validationError && styles.textInputError]}
            value={name}
            onChangeText={(text) => {
              setName(text);
              setValidationError(null); // Clear error when user types
            }}
            placeholder="Enter your name"
            placeholderTextColor="#999"
            maxLength={20}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            editable={!isValidating}
          />

          {validationError && (
            <Text style={styles.errorText}>{validationError}</Text>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                isValidating && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={isValidating}
            >
              {isValidating ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#2d5a2d" />
                  <Text style={styles.submitButtonText}>Checking...</Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Start Playing!</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip (use default)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#d4a574', // School theme border
  },
  subtitle: {
    fontSize: 20,
    fontFamily: 'CrayonPastel',
    color: '#8b5a3c',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    fontFamily: 'CrayonPastel',
    color: '#666',
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 20,
  },
  textInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#d4a574',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 18,
    fontFamily: 'CrayonPastel',
    backgroundColor: '#fef7e7',
    color: '#6b4423',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  submitButton: {
    backgroundColor: '#d4f6d4', // Light green
    borderWidth: 2,
    borderColor: '#4a7c4a',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'CrayonPastel',
    color: '#2d5a2d', // Dark green
  },
  skipButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontFamily: 'CrayonPastel',
    color: '#666',
  },
  textInputError: {
    borderColor: '#ef4444',
    borderWidth: 3,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontFamily: 'CrayonPastel',
    marginTop: 5,
    marginBottom: 10,
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
