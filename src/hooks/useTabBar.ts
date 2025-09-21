import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { showTabBar, hideTabBar } from '../store/slices/tabBarSlice';

export const useTabBar = () => {
  const dispatch = useAppDispatch();
  const isTabBarVisible = useAppSelector(state => state.tabBar.isTabBarVisible);

  const showTabBarAction = useCallback(() => {
    dispatch(showTabBar());
  }, [dispatch]);

  const hideTabBarAction = useCallback(() => {
    dispatch(hideTabBar());
  }, [dispatch]);

  return {
    isTabBarVisible,
    showTabBar: showTabBarAction,
    hideTabBar: hideTabBarAction,
  };
};