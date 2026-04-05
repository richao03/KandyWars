import { createSlice } from '@reduxjs/toolkit';

// Steps: 0=inactive, 1=wallet, 2=piggy bank, 3=tap gummy bears (buy),
// 4=buy confirm in TransactionModal, 5=next period button,
// 6=tap gummy bears (sell), 7=sell confirm in TransactionModal,
// 8=congrats modal → complete
interface TutorialState {
  tutorialStep: number;
  tutorialComplete: boolean;
}

const initialState: TutorialState = { tutorialStep: 0, tutorialComplete: false };

const tutorialSlice = createSlice({
  name: 'tutorial',
  initialState,
  reducers: {
    startTutorial(state) {
      state.tutorialStep = 1;
      state.tutorialComplete = false;
    },
    advanceTutorial(state) {
      if (state.tutorialStep >= 8) {
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
    },
  },
});

export const { startTutorial, advanceTutorial, skipTutorial, resetTutorial } =
  tutorialSlice.actions;

export const selectTutorialStep = (state: { tutorial: TutorialState }) =>
  state.tutorial.tutorialStep;
export const selectTutorialComplete = (state: { tutorial: TutorialState }) =>
  state.tutorial.tutorialComplete;

export default tutorialSlice.reducer;
