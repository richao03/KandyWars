// This script helps replace Alert.alert with GameModal in mini-games
const fs = require('fs');
const path = require('path');

const minigames = [
  'MathGame.tsx',
  'ComputerGame.tsx',
  'LogicGame.tsx',
  'EconomyGame.tsx',
  'HomeEcGame.tsx',
  'GymGame.tsx',
  'HistoryGame.tsx'
];

function replaceAlertsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add import if not present
  if (!content.includes('import GameModal')) {
    const importIndex = content.indexOf('import React');
    const nextLineIndex = content.indexOf('\n', importIndex);
    content = content.slice(0, nextLineIndex) + 
      "\nimport GameModal, { useGameModal } from '../components/GameModal';" +
      content.slice(nextLineIndex);
  }
  
  // Add useGameModal hook
  if (!content.includes('useGameModal')) {
    const functionMatch = content.match(/export default function \w+\(\) {/);
    if (functionMatch) {
      const insertIndex = functionMatch.index + functionMatch[0].length;
      content = content.slice(0, insertIndex) +
        "\n  const { modal, showModal, hideModal } = useGameModal();" +
        content.slice(insertIndex);
    }
  }
  
  // Replace Alert.alert with showModal
  content = content.replace(/Alert\.alert\(\s*'([^']+)',\s*'([^']+)'[^)]*\)/g, 
    "showModal('$1', '$2')");
  
  content = content.replace(/Alert\.alert\(\s*`([^`]+)`,\s*`([^`]+)`[^)]*\)/g, 
    "showModal(`$1`, `$2`)");
  
  // Add GameModal component before the closing View
  if (!content.includes('<GameModal')) {
    const lastViewIndex = content.lastIndexOf('</View>');
    content = content.slice(0, lastViewIndex) +
      "\n\n      <GameModal\n        visible={modal.visible}\n        title={modal.title}\n        message={modal.message}\n        emoji={modal.emoji}\n        onClose={hideModal}\n      />" +
      content.slice(lastViewIndex);
  }
  
  // Remove Alert import
  content = content.replace(/import \{ Alert[^}]*\} from 'react-native';/, 
    match => match.replace('Alert, ', '').replace(', Alert', '').replace('Alert', ''));
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Replaced alerts in ${path.basename(filePath)}`);
}

minigames.forEach(game => {
  const filePath = path.join(__dirname, '..', 'app', 'minigames', game);
  if (fs.existsSync(filePath)) {
    replaceAlertsInFile(filePath);
  }
});

console.log('🎉 All mini-game alerts replaced!');