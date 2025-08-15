import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';

interface StudyModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectSubject: (subject: string) => void;
  availableSubjects: string[];
}

const subjectColors: Record<string, { bg: string; border: string }> = {
  Math: { bg: '#e6f7ff', border: '#1890ff' }, // Light blue
  History: { bg: '#fff2e8', border: '#fa8c16' }, // Light orange
  'Home Ec': { bg: '#f6ffed', border: '#52c41a' }, // Light green
  Economy: { bg: '#fff1f0', border: '#f5222d' }, // Light red
  Logic: { bg: '#f9f0ff', border: '#722ed1' }, // Light purple
  Recess: { bg: '#fff0f6', border: '#eb2f96' }, // Light pink
  Computer: { bg: '#f0f5ff', border: '#2f54eb' }, // Light indigo
  Gym: { bg: '#feffe6', border: '#a0d911' }, // Light lime
};

export default function StudyModal({
  visible,
  onClose,
  onSelectSubject,
  availableSubjects,
}: StudyModalProps) {
  React.useEffect(() => {
    console.log('StudyModal visible state changed:', visible);
  }, [visible]);

  const handleSubjectSelect = (subject: string) => {
    console.log(`Starting ${subject} minigame...`);
    // TODO: Navigate to minigame screen based on subject
    // Each subject will have its own minigame:
    // - Math: Number/equation solving
    // - History: Timeline/fact matching
    // - Home Ec: Recipe/cooking simulation
    // - Social Studies: Geography/civics quiz
    // - Logic: Pattern/puzzle solving
    // - Recess: Word/story building
    // - Computer: Coding/typing challenges
    // - Gym: Reaction time/coordination games

    onSelectSubject(subject);
  };
  return (
    <Modal
      isVisible={visible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={300}
      animationOutTiming={200}
      backdropTransitionInTiming={300}
      backdropTransitionOutTiming={200}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      useNativeDriver={true}
      hideModalContentWhileAnimating={true}
      avoidKeyboard={true}
      style={styles.modalContainer}
    >
      <View style={styles.modal}>
        <Text style={styles.title}>Choose Subject to Study</Text>
        <Text style={styles.subtitle}>
          Pick a subject to improve your knowledge
        </Text>

        <View style={styles.subjectsGrid}>
          {availableSubjects.map((subject) => (
            <TouchableOpacity
              key={subject}
              style={[
                styles.subjectButton,
                {
                  backgroundColor: subjectColors[subject]?.bg || '#f0f0f0',
                  borderColor: subjectColors[subject]?.border || '#ccc',
                },
              ]}
              onPress={() => handleSubjectSelect(subject)}
            >
              <Text style={styles.subjectName}>{subject}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelText}>Never mind, maybe later</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'center',
    margin: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    maxWidth: 350,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#6b4423',
    fontFamily: 'CrayonPastel',
    textShadow: '1px 1px 0px #e6d4b7',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  subjectButton: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    color: '#5d4e37',
    fontFamily: 'CrayonPastel',
  },
  cancelButton: {
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
});
