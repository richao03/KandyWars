import { useDispatch, useSelector, TypedUseSelectorHook, shallowEqual } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Performance-optimized selector with shallow equality check
export const useShallowAppSelector = <T>(selector: (state: RootState) => T): T =>
  useSelector(selector, shallowEqual);