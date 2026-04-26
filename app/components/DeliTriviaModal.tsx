import React, { memo, useCallback, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import colors from '../../src/constants/colors';
import { type TriviaQuestion } from '../../src/constants/shopkeeperData';
import PixelBorder from './PixelBorder';

interface DeliTriviaModalProps {
  visible: boolean;
  question: TriviaQuestion | null;
  questionNumber: number; // 1-3
  onAnswer: (correct: boolean) => void;
  onClose: () => void;
  shopkeeperReaction: string; // Dialogue line for feedback
}

function DeliTriviaModal({
  visible,
  question,
  questionNumber,
  onAnswer,
  onClose,
  shopkeeperReaction,
}: DeliTriviaModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);

  // Track which question we're showing so we can reset state when it changes.
  // onAnswer dispatches immediately which updates the parent's currentTriviaQuestion,
  // so we need to delay showing the next question until the user presses "Next".
  const activeQuestionId = useRef<string | null>(null);
  if (question && question.id !== activeQuestionId.current) {
    // New question arrived — only reset if we're not in the middle of showing feedback
    if (!answered) {
      activeQuestionId.current = question.id;
      // State is already clean from handleNext or initial render
    }
    // If answered is true, we're showing feedback for the previous question.
    // Keep showing that until the user presses Next.
  }

  // The question to actually render — freeze on the current one until user presses Next
  const displayQuestion = useRef<TriviaQuestion | null>(question);
  if (!answered && question) {
    displayQuestion.current = question;
  }

  const handleSelect = useCallback(
    (index: number) => {
      if (answered || !displayQuestion.current) return;

      setSelectedIndex(index);
      setAnswered(true);
      const correct = index === displayQuestion.current.correctIndex;
      setWasCorrect(correct);
      onAnswer(correct);
    },
    [answered, onAnswer]
  );

  const handleNext = useCallback(() => {
    setSelectedIndex(null);
    setAnswered(false);
    setWasCorrect(false);
    activeQuestionId.current = null;
    displayQuestion.current = null;
    onClose();
  }, [onClose]);

  const shownQuestion = displayQuestion.current;
  if (!shownQuestion) return null;

  const getChoiceStyle = (index: number) => {
    if (!answered) return styles.choiceButton;
    if (index === shownQuestion.correctIndex) return [styles.choiceButton, styles.correctChoice];
    if (index === selectedIndex) return [styles.choiceButton, styles.wrongChoice];
    return [styles.choiceButton, styles.fadedChoice];
  };

  // Show the question number for the question we're actually displaying, not the next one
  const displayNumber = answered ? questionNumber - 1 || 1 : questionNumber;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <PixelBorder
          borderColor="#ff6b35"
          borderWidth={4}
          backgroundColor="rgba(13, 51, 81, 0.98)"
          innerPadding={16}
          style={styles.modal}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerText}>Trivia Time!</Text>
            <Text style={styles.counterText}>Question {displayNumber}/3</Text>
          </View>

          {/* Question */}
          <View style={styles.questionContainer}>
            <Text style={styles.questionText}>{shownQuestion.question}</Text>
          </View>

          {/* Choices */}
          <View style={styles.choicesContainer}>
            {shownQuestion.choices.map((choice, index) => (
              <TouchableOpacity
                key={`${shownQuestion.id}-${index}`}
                style={getChoiceStyle(index)}
                onPress={() => handleSelect(index)}
                activeOpacity={answered ? 1 : 0.7}
                disabled={answered}
              >
                <Text style={styles.choiceLetter}>
                  {String.fromCharCode(65 + index)}.
                </Text>
                <Text style={styles.choiceText}>{choice}</Text>
                {answered && index === shownQuestion.correctIndex && (
                  <Text style={styles.checkmark}>+5</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Feedback */}
          {answered && (
            <View style={styles.feedbackContainer}>
              <Text style={[
                styles.feedbackText,
                wasCorrect ? styles.correctFeedback : styles.wrongFeedback,
              ]}>
                {wasCorrect ? 'Correct!' : `Wrong! It was: ${shownQuestion.choices[shownQuestion.correctIndex]}`}
              </Text>
              <Text style={styles.reactionText}>&ldquo;{shopkeeperReaction}&rdquo;</Text>

              <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.7}>
                <Text style={styles.nextButtonText}>
                  {displayNumber >= 3 ? 'Done' : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </PixelBorder>
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
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.gold.light,
    fontFamily: 'PixeloidMono',
  },
  counterText: {
    fontSize: 12,
    color: colors.gray.light,
    fontFamily: 'PixeloidMono',
  },
  questionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  questionText: {
    fontSize: 14,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    lineHeight: 20,
  },
  choicesContainer: {
    gap: 8,
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    padding: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  correctChoice: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    borderColor: colors.green.success,
  },
  wrongChoice: {
    backgroundColor: 'rgba(220, 38, 38, 0.3)',
    borderColor: colors.red.error,
  },
  fadedChoice: {
    opacity: 0.4,
  },
  choiceLetter: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.orange.primary,
    fontFamily: 'PixeloidMono',
    marginRight: 8,
    width: 20,
  },
  choiceText: {
    fontSize: 12,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    flex: 1,
  },
  checkmark: {
    fontSize: 12,
    color: colors.green.success,
    fontFamily: 'PixeloidMono',
    fontWeight: '800',
  },
  feedbackContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    fontWeight: '800',
    marginBottom: 4,
  },
  correctFeedback: {
    color: colors.green.success,
  },
  wrongFeedback: {
    color: colors.red.error,
  },
  reactionText: {
    fontSize: 11,
    color: colors.gray.light,
    fontFamily: 'PixeloidMono',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  nextButton: {
    backgroundColor: colors.orange.primary,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  nextButtonText: {
    fontSize: 14,
    color: colors.white,
    fontFamily: 'PixeloidMono',
    fontWeight: '800',
  },
});

export default memo(DeliTriviaModal);
