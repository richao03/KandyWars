import { createListenerMiddleware } from '@reduxjs/toolkit';
import { SoundEffects } from '../../utils/soundEffects';
import { addBalance, withdrawFromStash } from '../slices/walletSlice';
import type { RootState } from '../store';

/**
 * Side-effect audio listener — keeps the coin SFX OUT of the wallet reducers
 * (reducers must stay pure). Listeners run after the action is reduced, so the
 * gameplay/state result is identical to firing the sound inline; this just
 * decouples the audio bridge call from the dispatch path.
 */
export const audioListenerMiddleware = createListenerMiddleware();

// Coin sound when money is added (positive amount only) — mirrors the old
// `addBalance` reducer guard.
audioListenerMiddleware.startListening({
  actionCreator: addBalance,
  effect: (action) => {
    if (action.payload > 0) {
      SoundEffects.playCoinSound();
    }
  },
});

// Coin sound on a *successful* stash withdrawal — mirrors the old
// `withdrawFromStash` guard (`stashedAmount >= payload`) by checking the
// pre-action state, so a rejected withdrawal stays silent.
audioListenerMiddleware.startListening({
  actionCreator: withdrawFromStash,
  effect: (action, listenerApi) => {
    const before = listenerApi.getOriginalState() as RootState;
    if (action.payload > 0 && before.wallet.stashedAmount >= action.payload) {
      SoundEffects.playCoinSound();
    }
  },
});
