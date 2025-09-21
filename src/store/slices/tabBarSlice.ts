import { createSlice } from '@reduxjs/toolkit';

interface TabBarState {
  isTabBarVisible: boolean;
}

const initialState: TabBarState = {
  isTabBarVisible: true,
};

const tabBarSlice = createSlice({
  name: 'tabBar',
  initialState,
  reducers: {
    showTabBar: (state) => {
      state.isTabBarVisible = true;
    },
    hideTabBar: (state) => {
      state.isTabBarVisible = false;
    },
    toggleTabBar: (state) => {
      state.isTabBarVisible = !state.isTabBarVisible;
    },
  },
});

export const { showTabBar, hideTabBar, toggleTabBar } = tabBarSlice.actions;
export default tabBarSlice.reducer;