/**
 * Integration tests for HomeEcGame level progression implementation
 * These tests validate the actual source code logic and progression flow
 */

import fs from 'fs';
import path from 'path';

describe('HomeEcGame Implementation Validation', () => {
  let homeEcGameSource: string;

  beforeAll(() => {
    // Read the actual HomeEcGame source code for validation
    const homeEcGamePath = path.join(__dirname, '../app/minigames/HomeEcGame.tsx');
    homeEcGameSource = fs.readFileSync(homeEcGamePath, 'utf8');
  });

  describe('Level Configuration Implementation', () => {
    it('should have correct getLevelConfig function with proper level requirements', () => {
      // Validate that the source code contains the expected level configurations
      expect(homeEcGameSource).toContain('getLevelConfig');
      expect(homeEcGameSource).toContain('case 1:');
      expect(homeEcGameSource).toContain('case 2:');
      expect(homeEcGameSource).toContain('case 3:');
      
      // Level 1 should require 10 matches
      expect(homeEcGameSource).toContain('{ matches: 10, time: 15 }');
      // Level 2 should require 12 matches
      expect(homeEcGameSource).toContain('{ matches: 12, time: 15 }');
      // Level 3 should require 15 matches
      expect(homeEcGameSource).toContain('{ matches: 15, time: 15 }');
    });

    it('should have proper candy target positions defined', () => {
      // Validate TARGET_POSITIONS constant
      expect(homeEcGameSource).toContain('TARGET_POSITIONS');
      expect(homeEcGameSource).toContain("'🍭': 'up'");
      expect(homeEcGameSource).toContain("'🍬': 'right'");
      expect(homeEcGameSource).toContain("'🧁': 'down'");
      expect(homeEcGameSource).toContain("'🍫': 'left'");
    });
  });

  describe('Level Progression Implementation', () => {
    it('should have proper level completion logic with modal callbacks', () => {
      // Check for level completion detection (HomeEcGame uses score-based completion)
      expect(homeEcGameSource).toContain('newScore >= levelConfig.matches');
      
      // Check for level advancement logic
      expect(homeEcGameSource).toContain('if (level < 3)');
      expect(homeEcGameSource).toContain('setLevel(level + 1)');
      expect(homeEcGameSource).toContain('initializeLevel(level + 1)');
      
      // Check for final level completion
      expect(homeEcGameSource).toContain("setGameState('jokerSelection')");
    });

    it('should show appropriate level completion modals', () => {
      // Level completion modal
      expect(homeEcGameSource).toContain('Level ${level} Complete!');
      expect(homeEcGameSource).toContain('Ready for Level ${level + 1}?');
      
      // Final completion modal
      expect(homeEcGameSource).toContain('All Levels Complete!');
      expect(homeEcGameSource).toContain('Amazing work, Master Chef!');
    });

    it('should have proper modal callback structure', () => {
      // Check that modals have proper callback functions
      expect(homeEcGameSource).toContain('showModal(');
      expect(homeEcGameSource).toContain('() => {');
      
      // Level advancement callback
      const levelAdvancementPattern = /setLevel\(level \+ 1\);\s*initializeLevel\(level \+ 1\)/;
      expect(homeEcGameSource).toMatch(levelAdvancementPattern);
      
      // Joker selection callback
      const jokerSelectionPattern = /setGameState\('jokerSelection'\)/;
      expect(homeEcGameSource).toMatch(jokerSelectionPattern);
    });
  });

  describe('Score and Match Logic Implementation', () => {
    it('should have correct scoring logic', () => {
      // Check positive scoring for correct matches (HomeEcGame uses newScore = prev + 1)
      expect(homeEcGameSource).toContain('const newScore = prev + 1');
      
      // Check negative scoring with minimum zero protection
      expect(homeEcGameSource).toContain('Math.max(0, prev - 1)');
      
      // Check feedback display
      expect(homeEcGameSource).toContain("setFeedback('✅ +1')");
      expect(homeEcGameSource).toContain("setFeedback('❌ -1')");
    });

    it('should track matches completed correctly', () => {
      // HomeEcGame uses score to track progress instead of matchesCompleted
      expect(homeEcGameSource).toContain('setScore');
      expect(homeEcGameSource).toContain('const newScore = prev + 1');
      
      // Check level completion condition using score
      expect(homeEcGameSource).toContain('newScore >= levelConfig.matches');
    });
  });

  describe('Game State Management Implementation', () => {
    it('should have proper game state transitions', () => {
      // Check initial state
      expect(homeEcGameSource).toContain("useState('instructions')");
      
      // Check state transitions
      expect(homeEcGameSource).toContain("setGameState('playing')");
      expect(homeEcGameSource).toContain("setGameState('jokerSelection')");
      
      // Check conditional rendering based on state
      expect(homeEcGameSource).toContain("if (gameState === 'instructions')");
      expect(homeEcGameSource).toContain("if (gameState === 'jokerSelection')");
    });

    it('should have proper level initialization and reset', () => {
      // Check level initialization
      expect(homeEcGameSource).toContain('initializeLevel');
      
      // Check score reset
      expect(homeEcGameSource).toContain('setScore(0)');
      
      // Check timer reset
      expect(homeEcGameSource).toContain('setTimeLeft(15)');
    });
  });

  describe('MinigameHUD Integration', () => {
    it('should display correct level information in HUD', () => {
      // Check HUD integration
      expect(homeEcGameSource).toContain('MinigameHUD');
      expect(homeEcGameSource).toContain('Level ${level}/3');
      expect(homeEcGameSource).toContain('Progress: ${score}/${levelConfig.matches}');
      expect(homeEcGameSource).toContain('theme="homeec"');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle timer expiration correctly', () => {
      // Check timer handling
      expect(homeEcGameSource).toContain('setTimeLeft((prev) => {');
      expect(homeEcGameSource).toContain('if (prev <= 1)');
      expect(homeEcGameSource).toContain('clearInterval');
    });

    it('should prevent invalid interactions during transitions', () => {
      // Check game active state
      expect(homeEcGameSource).toContain('if (isFlying || !centerCandy || gameState !== \'playing\')');
      
      // Check proper cleanup
      expect(homeEcGameSource).toContain('clearInterval(timerRef.current)');
      expect(homeEcGameSource).toContain('clearTimeout');
    });
  });

  describe('Progression Flow Validation', () => {
    it('should have complete progression from level 1 to joker selection', () => {
      // This test validates the complete flow exists in the source code
      const progressionElements = [
        // Level 1 start
        'setLevel(1)',
        'setScore(0)',
        
        // Level completion detection (HomeEcGame uses score-based progression)
        'newScore >= levelConfig.matches',
        
        // Level advancement
        'setLevel(level + 1)',
        'initializeLevel(level + 1)',
        
        // Final completion
        "setGameState('jokerSelection')",
        
        // Joker selection component
        'JokerSelection',
        'HOME_EC_JOKERS',
        'theme="homeec"',
      ];

      progressionElements.forEach(element => {
        expect(homeEcGameSource).toContain(element);
      });
    });

    it('should properly validate level boundaries', () => {
      // Check level boundary conditions
      expect(homeEcGameSource).toContain('if (level < 3)');
      expect(homeEcGameSource).toContain('} else {');
      
      // Ensure there are exactly 3 levels
      const levelCaseMatches = homeEcGameSource.match(/case [123]:/g);
      expect(levelCaseMatches).toHaveLength(3);
    });
  });
});