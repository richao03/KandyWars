import { createSlice } from '@reduxjs/toolkit';

// Steps: 0=inactive, 1=wallet, 2=piggy, 3=tap gummy bears, 4=buy confirm in modal,
// 5=next period, 6=tap gummy bears to sell, 7=sell tab in modal, 8=sell confirm,
// 9=jokers tab, 10=owned tab, 11=all tab
interface TutorialState {
  tutorialStep: number;
  tutorialComplete: boolean;
}

const initialState: TutorialState = {
  tutorialStep: 0,
  tutorialComplete: false,
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
      if (state.tutorialStep >= 11) {
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
