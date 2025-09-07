import React, { createContext, useContext, useState } from 'react';

type TabBarContextType = {
  isTabBarVisible: boolean;
  hideTabBar: () => void;
  showTabBar: () => void;
};

const TabBarContext = createContext<TabBarContextType | undefined>(undefined);

export const TabBarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);

  const hideTabBar = () => setIsTabBarVisible(false);
  const showTabBar = () => setIsTabBarVisible(true);

  return (
    <TabBarContext.Provider value={{ isTabBarVisible, hideTabBar, showTabBar }}>
      {children}
    </TabBarContext.Provider>
  );
};

export const useTabBar = (): TabBarContextType | null => {
  const context = useContext(TabBarContext);
  if (!context) {
    return null;
  }
  return context;
};