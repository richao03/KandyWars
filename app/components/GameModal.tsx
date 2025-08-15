// Simple wrapper for ConfirmationModal with game-specific theme
import React from 'react';
import ConfirmationModal from './ConfirmationModal';

interface GameModalProps {
  visible: boolean;
  title: string;
  message: string;
  emoji?: string;
  onClose: () => void;
  onConfirm?: () => void;
  theme?: 'school' | 'evening' | 'market';
  dismissible?: boolean;
}

export default function GameModal({
  visible,
  title,
  message,
  emoji = '🎮',
  onClose,
  onConfirm,
  theme = 'school',
  dismissible = true
}: GameModalProps) {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <ConfirmationModal
      visible={visible}
      title={title}
      message={message}
      emoji={emoji}
      confirmText="OK"
      onConfirm={handleConfirm}
      onCancel={onClose}
      theme={theme}
      dismissible={dismissible}
    />
  );
}

// Helper hook for mini-games
export function useGameModal() {
  const [modal, setModal] = React.useState({
    visible: false,
    title: '',
    message: '',
    emoji: '🎮',
    onConfirm: undefined as (() => void) | undefined,
    dismissible: true
  });

  const showModal = (title: string, message: string, emoji = '🎮', onConfirm?: () => void, dismissible = true) => {
    setModal({ visible: true, title, message, emoji, onConfirm, dismissible });
  };

  const hideModal = () => {
    setModal(prev => ({ ...prev, visible: false, onConfirm: undefined }));
  };

  return { modal, showModal, hideModal };
}