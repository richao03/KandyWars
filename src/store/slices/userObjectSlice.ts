import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserObject } from '../../services/firebase';

interface UserObjectState {
  cachedUser: UserObject | null;
  lastSynced: number | null; // Timestamp of last Firebase sync
}

const initialState: UserObjectState = {
  cachedUser: null,
  lastSynced: null,
};

const userObjectSlice = createSlice({
  name: 'userObject',
  initialState,
  reducers: {
    setCachedUserObject: (state, action: PayloadAction<UserObject>) => {
      state.cachedUser = action.payload;
      state.lastSynced = Date.now();
      if (__DEV__) console.log('📦 User object cached in Redux:', action.payload);
    },
    updateCachedUserObject: (state, action: PayloadAction<Partial<UserObject>>) => {
      if (state.cachedUser) {
        state.cachedUser = {
          ...state.cachedUser,
          ...action.payload,
        };
        if (__DEV__) console.log('📦 User object updated in Redux:', state.cachedUser);
      }
    },
    clearCachedUserObject: (state) => {
      state.cachedUser = null;
      state.lastSynced = null;
      if (__DEV__) console.log('📦 User object cleared from Redux');
    },
  },
});

export const {
  setCachedUserObject,
  updateCachedUserObject,
  clearCachedUserObject,
} = userObjectSlice.actions;

export default userObjectSlice.reducer;
