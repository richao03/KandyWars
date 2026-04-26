import { useEffect } from 'react';
import { JOKER_IDS, findJokerById } from '../constants/jokerIds';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  markLoanSharkIncomeApplied,
  selectDay,
} from '../store/slices/gameSlice';
import { useJokers } from './useJokers';
import { useWallet } from './useWallet';
import { getJokerEffectsAtLevel } from '../utils/jokerEffectEngine';
import { useToast } from '../context/ToastContext';

/**
 * Loan Shark Hook (Joker #58)
 *
 * Daily income side: at the start of each new day, Loan Shark grants
 * $5k/$8k/$12k cash to the player.
 *
 * The end-of-day debt side is handled separately in `computeEndDayBonuses`
 * (triggered when the player sleeps/ends the day).
 *
 * Dedup-per-day via Redux (parallels the Farmers Carry/Home Made pattern).
 */
export const useLoanShark = () => {
  const dispatch = useAppDispatch();
  const day = useAppSelector(selectDay);
  const daysApplied = useAppSelector(
    (state) => state.game.loanSharkIncomeAppliedDays ?? []
  );

  const { jokers } = useJokers();
  const { add: addMoney } = useWallet();
  const { showToast } = useToast();

  useEffect(() => {
    if (day <= 0 || daysApplied.includes(day)) {
      return;
    }

    const loanSharkJoker = findJokerById(jokers, JOKER_IDS.LOAN_SHARK);
    if (!loanSharkJoker) {
      return;
    }

    const level = (loanSharkJoker as any).level ?? 1;
    const effects = getJokerEffectsAtLevel(JOKER_IDS.LOAN_SHARK, level);
    // The 'add' operation on 'loan_shark_income' is the daily income (positive).
    const incomeEffect = effects.find(
      (e) => e.target === 'loan_shark_income' && e.operation === 'add'
    );
    if (!incomeEffect) {
      return;
    }

    const amount = incomeEffect.amount;
    addMoney(amount);
    showToast(`Loan Shark +$${amount.toLocaleString()}`);

    dispatch(markLoanSharkIncomeApplied(day));

    if (__DEV__) {
      console.log(
        `🦈 Loan Shark: +$${amount} daily income (day ${day}, level ${level})`
      );
    }
  }, [day, daysApplied, jokers, addMoney, dispatch, showToast]);

  return {};
};
