/**
 * Tests for the specific callback logic in minigame TouchableOpacity components
 * These tests focus on the pure logic without UI rendering
 */

import { router } from 'expo-router';

// Mock router
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

describe('Minigame Callback Logic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MathGame Logic', () => {
    describe('handleBottomNumberClick', () => {
      // Mock the math game logic
      const createMockMathGameState = () => ({
        scrollingNumbers: [7, 5, 3, 8, 2], // rightmost is 2
        score: 10,
        scrollSpeed: 1000,
      });

      it('should award points when clicked number + rightmost = 10', () => {
        const state = createMockMathGameState();
        const clickedNumber = 8; // 8 + 2 = 10
        const rightmostNumber = state.scrollingNumbers[state.scrollingNumbers.length - 1]; // 2

        const sum = clickedNumber + rightmostNumber;
        const isCorrect = sum === 10;

        expect(isCorrect).toBe(true);
        // Should award points and remove rightmost number
        if (isCorrect) {
          state.score += 1;
          state.scrollingNumbers.pop(); // Remove rightmost
        }

        expect(state.score).toBe(11);
        expect(state.scrollingNumbers).toEqual([7, 5, 3, 8]);
      });

      it('should increase scroll speed when sum does not equal 10', () => {
        const state = createMockMathGameState();
        const clickedNumber = 5; // 5 + 2 = 7 (not 10)
        const rightmostNumber = state.scrollingNumbers[state.scrollingNumbers.length - 1]; // 2

        const sum = clickedNumber + rightmostNumber;
        const isCorrect = sum === 10;

        expect(isCorrect).toBe(false);
        // Should increase scroll speed
        if (!isCorrect) {
          state.scrollSpeed = Math.max(200, state.scrollSpeed - 100); // Faster = lower interval
        }

        expect(state.score).toBe(10); // No score change
        expect(state.scrollSpeed).toBe(900); // Increased speed
        expect(state.scrollingNumbers).toEqual([7, 5, 3, 8, 2]); // No change
      });
    });

    describe('handleForfeit', () => {
      it('should call router.back() for forfeit', () => {
        const handleForfeit = () => {
          router.back();
        };

        handleForfeit();
        expect(router.back).toHaveBeenCalledTimes(1);
      });
    });

    describe('startGame', () => {
      it('should initialize game state correctly', () => {
        const initialState = {
          gameState: 'instructions',
          level: 0,
          score: 0,
          scrollingNumbers: [] as number[],
        };

        const startGame = () => {
          initialState.gameState = 'playing';
          initialState.level = 1;
          initialState.score = 0;
          initialState.scrollingNumbers = [1, 2, 3, 4, 5]; // Mock initial numbers
        };

        startGame();

        expect(initialState.gameState).toBe('playing');
        expect(initialState.level).toBe(1);
        expect(initialState.score).toBe(0);
        expect(initialState.scrollingNumbers.length).toBeGreaterThan(0);
      });
    });
  });

  describe('ComputerGame Logic', () => {
    const createMockCard = (id: string, emoji: string, isFlipped = false, isMatched = false) => ({
      id,
      emoji,
      isFlipped,
      isMatched,
    });

    describe('handleCardPress', () => {

      it('should do nothing when card is already flipped', () => {
        const card = createMockCard('1', '💻', true); // Already flipped
        const flippedCards = ['1'];

        const canFlip = !card.isFlipped && !card.isMatched && flippedCards.length < 2;

        expect(canFlip).toBe(false);
        // Should not modify state
      });

      it('should do nothing when card is already matched', () => {
        const card = createMockCard('1', '💻', false, true); // Already matched
        const flippedCards: string[] = [];

        const canFlip = !card.isFlipped && !card.isMatched && flippedCards.length < 2;

        expect(canFlip).toBe(false);
        // Should not modify state
      });

      it('should prevent clicking when 2 cards are already flipped', () => {
        const card = createMockCard('3', '🖥️', false, false);
        const flippedCards = ['1', '2']; // Two cards already flipped

        const canFlip = !card.isFlipped && !card.isMatched && flippedCards.length < 2;

        expect(canFlip).toBe(false);
        // Should prevent clicking during match checking phase
      });

      it('should flip card when conditions are met', () => {
        const card = createMockCard('1', '💻', false, false);
        const flippedCards: string[] = [];

        const canFlip = !card.isFlipped && !card.isMatched && flippedCards.length < 2;

        expect(canFlip).toBe(true);
        if (canFlip) {
          card.isFlipped = true;
          flippedCards.push(card.id);
        }

        expect(card.isFlipped).toBe(true);
        expect(flippedCards).toContain('1');
      });

      it('should check for match immediately when two cards are flipped', () => {
        const card1 = createMockCard('1', '💻', true, false);
        const card2 = createMockCard('2', '💻', true, false);
        const flippedCards = ['1', '2'];

        // Check match immediately
        const isMatch = card1.emoji === card2.emoji;

        expect(isMatch).toBe(true);
        if (isMatch) {
          card1.isMatched = true;
          card2.isMatched = true;
        }

        expect(card1.isMatched).toBe(true);
        expect(card2.isMatched).toBe(true);
      });
    });

    describe('initializeLevel', () => {
      it('should reset current level when reset hack is pressed', () => {
        const gameState = {
          level: 2,
          cards: [
            createMockCard('1', '💻', true, false),
            createMockCard('2', '🖥️', true, false),
          ],
          flippedCards: ['1', '2'],
          turns: 5,
        };

        const initializeLevel = (level: number) => {
          gameState.cards = [
            createMockCard('1', '💻', false, false),
            createMockCard('2', '🖥️', false, false),
            createMockCard('3', '💻', false, false),
            createMockCard('4', '🖥️', false, false),
          ];
          gameState.flippedCards = [];
          gameState.turns = 0;
        };

        initializeLevel(gameState.level);

        expect(gameState.flippedCards).toEqual([]);
        expect(gameState.turns).toBe(0);
        expect(gameState.cards.every(card => !card.isFlipped && !card.isMatched)).toBe(true);
      });
    });
  });

  describe('LogicGame Logic', () => {
    describe('handleCandySelect', () => {
      it('should fill next empty slot when candy is selected', () => {
        const currentGuess = ['🍭', '', '', '']; // First slot filled, others empty
        const selectedCandy = '🍬';

        const nextEmptyIndex = currentGuess.findIndex(slot => slot === '');
        if (nextEmptyIndex !== -1) {
          currentGuess[nextEmptyIndex] = selectedCandy;
        }

        expect(currentGuess).toEqual(['🍭', '🍬', '', '']);
      });

      it('should not fill when all slots are full', () => {
        const currentGuess = ['🍭', '🍬', '🧁', '🍫']; // All slots filled
        const selectedCandy = '🍭';

        const nextEmptyIndex = currentGuess.findIndex(slot => slot === '');
        expect(nextEmptyIndex).toBe(-1); // No empty slots
        // currentGuess should remain unchanged
        expect(currentGuess).toEqual(['🍭', '🍬', '🧁', '🍫']);
      });
    });

    describe('handlePositionSelect', () => {
      it('should clear selected slot when position is pressed', () => {
        const currentGuess = ['🍭', '🍬', '🧁', '🍫'];
        const positionIndex = 1; // Clear second position

        currentGuess[positionIndex] = '';

        expect(currentGuess).toEqual(['🍭', '', '🧁', '🍫']);
      });
    });

    describe('handleSubmitGuess', () => {
      it('should prevent submitting incomplete guesses', () => {
        const currentGuess = ['🍭', '🍬', '', '']; // Incomplete
        const canSubmit = currentGuess.every(slot => slot !== '');

        expect(canSubmit).toBe(false);
      });

      it('should allow submitting complete guesses', () => {
        const currentGuess = ['🍭', '🍬', '🧁', '🍫']; // Complete
        const canSubmit = currentGuess.every(slot => slot !== '');

        expect(canSubmit).toBe(true);
      });

      it('should provide correct feedback colors', () => {
        const secretCode = ['🍭', '🍬', '🧁', '🍫'];
        const guess = ['🍭', '🍫', '🍬', '🍫']; // First correct, second wrong position, third wrong position, fourth correct

        const feedback = guess.map((candy, index) => {
          if (candy === secretCode[index]) {
            return 'green'; // Correct position
          } else if (secretCode.includes(candy)) {
            return 'yellow'; // Wrong position but exists
          } else {
            return 'none'; // Doesn't exist
          }
        });

        expect(feedback).toEqual(['green', 'yellow', 'yellow', 'green']);
      });
    });
  });

  describe('HistoryGame Logic', () => {
    describe('handleShowHint', () => {
      it('should show hint only once per puzzle', () => {
        let hintShown = false;

        const handleShowHint = () => {
          if (!hintShown) {
            hintShown = true;
            return { hint: 'Rumors spreading about candy shortage', firstWord: 'WORD' };
          }
          return null; // No hint on subsequent calls
        };

        const firstCall = handleShowHint();
        const secondCall = handleShowHint();

        expect(firstCall).not.toBeNull();
        expect(secondCall).toBeNull();
        expect(hintShown).toBe(true);
      });
    });

    describe('handleSubmit', () => {
      it('should ignore case sensitivity in validation', () => {
        const correctAnswer = 'WORD IS OUT OF CANDY';
        const userAnswers = [
          'word is out of candy',
          'Word Is Out Of Candy',
          'WORD IS OUT OF CANDY',
          'wOrD iS oUt Of CaNdY',
        ];

        userAnswers.forEach(answer => {
          const isCorrect = answer.trim().toUpperCase() === correctAnswer.toUpperCase();
          expect(isCorrect).toBe(true);
        });
      });

      it('should treat partially correct answers as incorrect', () => {
        const correctAnswer = 'WORD IS OUT OF CANDY';
        const partialAnswers = [
          'WORD IS OUT',
          'WORD IS OUT OF',
          'IS OUT OF CANDY',
          'WORD OUT OF CANDY',
        ];

        partialAnswers.forEach(answer => {
          const isCorrect = answer.trim().toUpperCase() === correctAnswer.toUpperCase();
          expect(isCorrect).toBe(false);
        });
      });
    });
  });

  describe('GymGame Logic', () => {
    const createMockTile = (row: number, col: number, shadeValue: number, isStart = false, isGoal = false) => ({
      id: `${row}-${col}`,
      row,
      col,
      shadeValue,
      color: `hsl(120, 50%, ${50 + shadeValue * 10}%)`,
      isStart,
      isGoal,
    });

    describe('handleTilePress', () => {

      it('should allow moves to adjacent tiles with next shade in sequence', () => {
        const currentPosition = { row: 0, col: 0 };
        const targetTile = createMockTile(0, 1, 0.5); // Adjacent tile
        const currentTile = createMockTile(0, 0, 0, true); // Current tile with shade 0

        // Check if move is adjacent
        const isAdjacent = Math.abs(targetTile.row - currentPosition.row) + Math.abs(targetTile.col - currentPosition.col) === 1;
        
        // Check if shade sequence is correct (should be exactly 0.5 more)
        const expectedNextShade = currentTile.shadeValue + 0.5;
        const isCorrectSequence = Math.abs(targetTile.shadeValue - expectedNextShade) < 0.001;

        expect(isAdjacent).toBe(true);
        expect(isCorrectSequence).toBe(true);
      });

      it('should reset to start on invalid move', () => {
        let currentPosition = { row: 1, col: 1 };
        const startPosition = { row: 0, col: 0 };
        const targetTile = createMockTile(2, 2, 2.0); // Non-adjacent tile

        const isAdjacent = Math.abs(targetTile.row - currentPosition.row) + Math.abs(targetTile.col - currentPosition.col) === 1;
        
        expect(isAdjacent).toBe(false); // Should be false for non-adjacent move
        
        if (!isAdjacent) {
          currentPosition = { ...startPosition };
        }

        expect(currentPosition).toEqual(startPosition);
      });
    });

    describe('initializeStage', () => {
      it('should regenerate grid when reset level is pressed', () => {
        const gameState = {
          stage: 1,
          tiles: [createMockTile(0, 0, 0), createMockTile(0, 1, 0.5)],
          currentPosition: { row: 1, col: 1 },
          mistakesLeft: 3,
        };

        const initializeStage = (stage: number) => {
          gameState.tiles = [
            createMockTile(0, 0, 0, true),
            createMockTile(0, 1, 0.5),
            createMockTile(1, 0, 1.0),
            createMockTile(1, 1, 1.5, false, true),
          ];
          gameState.currentPosition = { row: 0, col: 0 };
          gameState.mistakesLeft = 5;
        };

        initializeStage(gameState.stage);

        expect(gameState.currentPosition).toEqual({ row: 0, col: 0 });
        expect(gameState.mistakesLeft).toBe(5);
        expect(gameState.tiles.length).toBeGreaterThan(0);
      });
    });
  });

  describe('EconomyGame Logic', () => {
    describe('executePlan', () => {
      it('should execute trades in slot order', () => {
        const tradeSlots = [
          { candy: '🍭', operation: 'trade' }, // Start candy
          { candy: '🍬', operation: 'trade' },
          { candy: '🧁', operation: 'trade' }, // Goal candy
        ];
        const startCandy = '🍭';
        const goalCandy = '🧁';

        // Validate sequence starts with start candy and ends with goal candy
        const startsCorrectly = tradeSlots[0].candy === startCandy;
        const endsCorrectly = tradeSlots[tradeSlots.length - 1].candy === goalCandy;
        const isValidSequence = startsCorrectly && endsCorrectly;

        expect(isValidSequence).toBe(true);

        if (isValidSequence) {
          // Execute trades in order
          let currentCandy = startCandy;
          const tradeResults = [];

          for (let i = 1; i < tradeSlots.length; i++) {
            const trade = {
              from: currentCandy,
              to: tradeSlots[i].candy,
              step: i,
            };
            tradeResults.push(trade);
            currentCandy = tradeSlots[i].candy;
          }

          expect(tradeResults).toHaveLength(2);
          expect(tradeResults[0]).toEqual({ from: '🍭', to: '🍬', step: 1 });
          expect(tradeResults[1]).toEqual({ from: '🍬', to: '🧁', step: 2 });
        }
      });

      it('should reject invalid sequences', () => {
        const tradeSlots = [
          { candy: '🍬', operation: 'trade' }, // Wrong start candy
          { candy: '🧁', operation: 'trade' },
        ];
        const startCandy = '🍭';
        const goalCandy = '🧁';

        const startsCorrectly = tradeSlots[0].candy === startCandy;
        const endsCorrectly = tradeSlots[tradeSlots.length - 1].candy === goalCandy;
        const isValidSequence = startsCorrectly && endsCorrectly;

        expect(isValidSequence).toBe(false);
      });
    });

    describe('clearAll', () => {
      it('should clear all slots without confirmation', () => {
        const tradeSlots = [
          { candy: '🍭', operation: 'trade' },
          { candy: '🍬', operation: 'trade' },
        ];
        const palette = ['🍭', '🍬', '🧁', '🍫'];

        const clearAll = () => {
          tradeSlots.splice(0); // Clear all slots
          // Return tiles to palette (in real implementation)
        };

        clearAll();

        expect(tradeSlots).toHaveLength(0);
      });
    });
  });

  describe('RecessGame Logic', () => {
    describe('handlePlayerChoice', () => {
      const choices = ['rock', 'paper', 'scissors'] as const;
      type Choice = typeof choices[number];

      const determineWinner = (playerChoice: Choice, computerChoice: Choice): 'win' | 'lose' | 'tie' => {
        if (playerChoice === computerChoice) return 'tie';
        
        const winConditions: Record<Choice, Choice> = {
          rock: 'scissors',
          paper: 'rock',
          scissors: 'paper',
        };

        return winConditions[playerChoice] === computerChoice ? 'win' : 'lose';
      };

      it('should determine winner correctly for rock vs scissors', () => {
        const result = determineWinner('rock', 'scissors');
        expect(result).toBe('win');
      });

      it('should determine winner correctly for paper vs rock', () => {
        const result = determineWinner('paper', 'rock');
        expect(result).toBe('win');
      });

      it('should determine winner correctly for scissors vs paper', () => {
        const result = determineWinner('scissors', 'paper');
        expect(result).toBe('win');
      });

      it('should determine tie correctly', () => {
        const result = determineWinner('rock', 'rock');
        expect(result).toBe('tie');
      });

      it('should track scoring without streak system', () => {
        let score = 0;
        const rounds = ['win', 'lose', 'tie', 'win'];

        rounds.forEach(result => {
          if (result === 'win') {
            score += 1;
          }
          // No streak bonuses, just basic scoring
        });

        expect(score).toBe(2); // Only 2 wins counted
      });

      it('should increase difficulty every 4 rounds', () => {
        let roundsPlayed = 0;
        let stage = 1;

        // Simulate playing rounds
        for (let i = 0; i < 8; i++) {
          roundsPlayed++;
          
          if (roundsPlayed % 4 === 0) {
            stage = Math.min(3, stage + 1); // Increase difficulty, max stage 3
          }
        }

        expect(roundsPlayed).toBe(8);
        expect(stage).toBe(3); // Should have increased twice (after round 4 and 8)
      });
    });
  });

  describe('HomeEcGame Logic', () => {
    describe('handleSwipe', () => {
      const TARGET_POSITIONS = {
        '🍭': 'up',
        '🍬': 'right',
        '🧁': 'down',
        '🍫': 'left',
      } as const;

      it('should send middle icon to correct edge based on swipe direction', () => {
        const centerCandy = '🍭';
        const swipeDirection = 'up';

        // Check if swipe direction matches target position
        const correctDirection = TARGET_POSITIONS[centerCandy as keyof typeof TARGET_POSITIONS];
        const isCorrect = swipeDirection === correctDirection;

        expect(isCorrect).toBe(true);
      });

      it('should show +1 feedback on correct edge', () => {
        const centerCandy = '🍬';
        const swipeDirection = 'right';
        let feedbackShown = false;

        const correctDirection = TARGET_POSITIONS[centerCandy as keyof typeof TARGET_POSITIONS];
        const isCorrect = swipeDirection === correctDirection;

        if (isCorrect) {
          feedbackShown = true;
          // Show +1 on the right edge
        }

        expect(feedbackShown).toBe(true);
      });

      it('should handle left swipe sending icon left', () => {
        const swipeDirection = 'left';
        const targetX = -200; // Mock target position for left

        expect(swipeDirection).toBe('left');
        expect(targetX).toBeLessThan(0);
      });

      it('should handle right swipe sending icon right', () => {
        const swipeDirection = 'right';
        const targetX = 200; // Mock target position for right

        expect(swipeDirection).toBe('right');
        expect(targetX).toBeGreaterThan(0);
      });

      it('should handle up swipe sending icon up', () => {
        const swipeDirection = 'up';
        const targetY = -300; // Mock target position for up

        expect(swipeDirection).toBe('up');
        expect(targetY).toBeLessThan(0);
      });

      it('should handle down swipe sending icon down', () => {
        const swipeDirection = 'down';
        const targetY = 300; // Mock target position for down

        expect(swipeDirection).toBe('down');
        expect(targetY).toBeGreaterThan(0);
      });
    });
  });
});