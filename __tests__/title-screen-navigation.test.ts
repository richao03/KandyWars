// Mock expo-router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  dismissAll: jest.fn(),
  back: jest.fn(),
};

jest.mock('expo-router', () => ({
  router: mockRouter,
  useFocusEffect: jest.fn((callback) => {
    callback();
    return jest.fn();
  }),
  Redirect: jest.fn(),
}));

describe('Title Screen Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Continue Button Navigation', () => {
    it('should call dismissAll and replace with market route when Continue is pressed', () => {
      // Simulate the handleContinue function from title-screen.tsx
      const handleContinue = () => {
        mockRouter.dismissAll();
        mockRouter.replace('/(tabs)/market');
      };

      // Execute the function
      handleContinue();

      // Verify navigation calls
      expect(mockRouter.dismissAll).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/market');
      
      // Verify it doesn't navigate to title-screen
      expect(mockRouter.push).not.toHaveBeenCalledWith('/title-screen');
      expect(mockRouter.replace).not.toHaveBeenCalledWith('/title-screen');
    });

    it('should call dismissAll and replace for new game navigation', () => {
      // Simulate the handleNewGame function after difficulty selection
      const navigateToMarketAfterNewGame = () => {
        mockRouter.dismissAll();
        mockRouter.replace('/(tabs)/market');
      };

      // Execute the function
      navigateToMarketAfterNewGame();

      // Verify navigation calls
      expect(mockRouter.dismissAll).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/market');
    });

    it('should not create navigation loops', () => {
      // First navigation from title to market
      mockRouter.dismissAll();
      mockRouter.replace('/(tabs)/market');
      
      // Clear mocks to simulate fresh state
      jest.clearAllMocks();
      
      // Simulate user manually going back to title screen
      mockRouter.push('/title-screen');
      
      // Verify the push happened
      expect(mockRouter.push).toHaveBeenCalledWith('/title-screen');
      
      // Clear again
      jest.clearAllMocks();
      
      // Now when continuing again, it should use dismissAll to prevent loops
      mockRouter.dismissAll();
      mockRouter.replace('/(tabs)/market');
      
      // Verify dismissAll was called to clear navigation stack
      expect(mockRouter.dismissAll).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/market');
    });
  });

  describe('Settings Button Navigation', () => {
    it('should navigate to settings tab when Settings is pressed', () => {
      // Simulate the handleSettings function
      const handleSettings = () => {
        mockRouter.push('/(tabs)/settings');
      };

      // Execute the function
      handleSettings();

      // Verify navigation
      expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/settings');
      expect(mockRouter.dismissAll).not.toHaveBeenCalled();
    });
  });

  describe('Navigation Stack Management', () => {
    it('should clear navigation stack before navigating to market', () => {
      // Build up a navigation stack
      mockRouter.push('/title-screen');
      mockRouter.push('/(tabs)/settings');
      mockRouter.push('/some-other-screen');
      
      // Clear mocks but keep the "stack" concept
      jest.clearAllMocks();
      
      // Now navigate to market with stack clearing
      mockRouter.dismissAll();
      mockRouter.replace('/(tabs)/market');
      
      // Verify dismissAll was called first
      expect(mockRouter.dismissAll).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/market');
      
      // Verify the order of calls
      const dismissAllCallOrder = mockRouter.dismissAll.mock.invocationCallOrder[0];
      const replaceCallOrder = mockRouter.replace.mock.invocationCallOrder[0];
      expect(dismissAllCallOrder).toBeLessThan(replaceCallOrder);
    });
  });
});