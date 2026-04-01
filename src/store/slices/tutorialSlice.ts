import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Steps: 0=inactive, 1=welcome modal, 2=wallet spotlight, 3=piggy bank spotlight,
// 4=tap gummy bears to buy, 5=buy confirm in modal, 6=next period button,
// 7=tap gummy bears to sell, 8=sell confirm in modal
// After step 8: congrats modal → tutorialComplete = true
interface TutorialState {
  tutorialStep: number;
  tutorialComplete: boolean;
  firstTimeHints: Record<string, boolean>;
}

const initialState: TutorialState = {
  tutorialStep: 0,
  tutorialComplete: false,
  firstTimeHints: {},
};

const tutorialSlice = createSlice({
  name: 'tutorial',
  initialState,
  reducers: {
    startTutorial(state) {
      if (!state.tutorialComplete) {
        state.tutorialStep = 1;
      }
    },
    advanceTutorial(state) {
      if (state.tutorialStep >= 8) {
        // Last step — mark complete
        state.tutorialStep = 0;
        state.tutorialComplete = true;
      } else if (state.tutorialStep > 0) {
        state.tutorialStep += 1;
      }
    },
    skipTutorial(state) {
      state.tutorialStep = 0;
      state.tutorialComplete = true;
    },
    resetTutorial(state) {
      state.tutorialStep = 0;
      state.tutorialComplete = false;
      state.firstTimeHints = {};
    },
    markHintSeen(state, action: PayloadAction<string>) {
      state.firstTimeHints[action.payload] = true;
    },
  },
});

export const { startTutorial, advanceTutorial, skipTutorial, resetTutorial, markHintSeen } =
  tutorialSlice.actions;

export const selectTutorialStep = (state: { tutorial: TutorialState }) =>
  state.tutorial.tutorialStep;
export const selectTutorialComplete = (state: { tutorial: TutorialState }) =>
  state.tutorial.tutorialComplete;
export const selectHintSeen = (key: string) => (state: { tutorial: TutorialState }) =>
  state.tutorial.firstTimeHints[key] ?? false;
export const selectFirstTimeHints = (state: { tutorial: TutorialState }) =>
  state.tutorial.firstTimeHints;

export default tutorialSlice.reducer;
