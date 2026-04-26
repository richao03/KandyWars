import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import colors from '../../src/constants/colors';
import { useFlavorText } from '../../src/context/FlavorTextContext';
import { useCandySales } from '../../src/hooks/useCandySales';
import { useDailyStats } from '../../src/hooks/useDailyStats';
import { useGame } from '../../src/hooks/useGame';
import { useHallPass } from '../../src/hooks/useHallPass';
import { useInventory } from '../../src/hooks/useInventory';
import { useJokers } from '../../src/hooks/useJokers';
import { useMinigameTracking } from '../../src/hooks/useMinigameTracking';
import { useScoreboard } from '../../src/hooks/useScoreboard';
import { useSeed } from '../../src/hooks/useSeed';
import { useShopkeeper } from '../../src/hooks/useShopkeeper';
import { useWallet } from '../../src/hooks/useWallet';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { resetEarlySaleFlag } from '../../src/store/slices/candySalesSlice';
import { getPeriodsPerDay } from '../../src/store/slices/gameSlice';
import { MusicController } from '../../src/utils/musicController';
import FirstTimeHint from '../components/FirstTimeHint';
import GameHUD from '../components/GameHUD';
import GoingToSchoolModal from '../components/GoingToSchoolModal';
import PixelBorder from '../components/PixelBorder';
import SleepConfirmModal from '../components/SleepConfirmModal';
import StudySubjectSelector from '../components/StudySubjectSelector';
import DeliPage from '../deli';
import PiggyBankPage from '../piggy-bank';

const InventoryModal = lazy(() => import('../components/InventoryModal'));

const ACTIVITY_IMAGES = {
  study: require('../../assets/images/emojis/study.png'),
  stash: require('../../assets/images/emojis/piggyBank.png'),
  deli: require('../../assets/images/emojis/deli.png'),
  sleep: require('../../assets/images/emojis/sleep.png'),
};

// --- Puzzle Tile Component ---
function PuzzleTile({
  item,
  style: tileStyle,
}: {
  item: {
    id: string;
    title: string;
    desc: string;
    onPress: () => void;
    disabled: boolean;
  };
  style?: any;
}) {
  return (
    <TouchableOpacity
      onPress={() => {
        if (!item.disabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          item.onPress();
        }
      }}
      disabled={item.disabled}
      activeOpacity={0.7}
      style={[styles.tile, tileStyle]}
    >
      <PixelBorder
        borderColor="#f7e98e"
        borderWidth={3}
        backgroundColor={
          item.disabled ? 'rgba(30,25,35,0.6)' : 'rgba(0,0,0,0.55)'
        }
        innerPadding={0}
        fill
      >
        {/* Content */}
        <View style={styles.tileContent}>
          <Image
            source={ACTIVITY_IMAGES[item.id as keyof typeof ACTIVITY_IMAGES]}
            style={[styles.tileIcon, item.disabled && styles.disabledIcon]}
            resizeMode="contain"
          />
          <Text
            style={[styles.tileTitle, item.disabled && styles.disabledText]}
          >
            {item.title}
          </Text>
          <Text
            style={[styles.tileSub, item.disabled && styles.disabledText]}
            numberOfLines={2}
          >
            {item.desc}
          </Text>
        </View>
      </PixelBorder>
    </TouchableOpacity>
  );
}

// --- Main Component ---
function AfterSchoolPage() {
  const isFocused = useIsFocused();
  const dispatch = useAppDispatch();
  const periodsPerDay = useAppSelector((state) => getPeriodsPerDay(state));

  const {
    day,
    startNewDay,
    hasStudiedTonight,
    periodCount,
    setLastActiveView,
    setIsInitialized,
    resetGame,
  } = useGame();
  const { resetDailyStats, addAllowance: addAllowanceToStats } =
    useDailyStats();
  const {
    balance,
    stashedAmount,
    adoptionFee,
    addAllowance,
    difficultyLevel,
    applyDailyInterest,
    applyInheritance,
  } = useWallet();
  const { jokers, resetDailyJokerUsage } = useJokers();
  const { resetDaily: resetDailyShopkeeper } = useShopkeeper();
  const { inventory, getTotalInventoryCount, getInventoryLimit } =
    useInventory();
  const { setEvent } = useFlavorText();
  const { trackGameCompleted } = useScoreboard();
  const { checkUnlockRequirements } = useHallPass();
  const { hasPlayedAllMinigames } = useMinigameTracking();
  const { totalCandiesSold } = useCandySales();
  const { gameData } = useSeed();

  const [sleepConfirmModalVisible, setSleepConfirmModalVisible] =
    useState(false);
  const [goingToSchoolModalVisible, setGoingToSchoolModalVisible] =
    useState(false);
  const [allowanceAmount, setAllowanceAmount] = useState(0);
  const [guaranteedEventWarnings, setGuaranteedEventWarnings] = useState<
    string[]
  >([]);
  const [showStudySubjects, setShowStudySubjects] = useState(false);
  const [showStash, setShowStash] = useState(false);
  const [showDeli, setShowDeli] = useState(false);
  const [showInventory, setShowInventory] = useState(false);

  useEffect(() => {
    setEvent('AFTER_SCHOOL');
    setLastActiveView('after-school');
  }, [setEvent, setLastActiveView]);

  const handleStudy = useCallback(() => {
    if (!hasStudiedTonight) setShowStudySubjects(true);
  }, [hasStudiedTonight]);

  const handleBackToOptions = useCallback(() => {
    setShowStudySubjects(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (hasStudiedTonight) setShowStudySubjects(false);
    }, [hasStudiedTonight])
  );

  useFocusEffect(
    useCallback(() => {
      MusicController.setTrack(showStudySubjects ? 'day2' : 'day5');
    }, [showStudySubjects])
  );

  const handleStashMoney = useCallback(() => setShowStash(true), []);
  const handleGoDeli = useCallback(() => setShowDeli(true), []);
  const handleGoToSleep = useCallback(
    () => setSleepConfirmModalVisible(true),
    []
  );

  useEffect(() => {
    if (!goingToSchoolModalVisible) MusicController.stop();
  }, [goingToSchoolModalVisible]);

  const handleSleepConfirm = () => {
    setSleepConfirmModalVisible(false);

    const earnedInterest = applyDailyInterest(jokers);
    const inheritanceTransfer = applyInheritance();
    const receivedAllowance = addAllowance(jokers, periodCount);
    setAllowanceAmount(receivedAllowance);
    addAllowanceToStats(receivedAllowance);

    const nextDayStart =
      Math.floor(periodCount / periodsPerDay) * periodsPerDay +
      periodsPerDay +
      1;
    const nextDayEnd = nextDayStart + periodsPerDay - 1;
    const warnings = gameData.periodEvents
      .filter(
        (e) =>
          e.isGuaranteedEvent &&
          e.period >= nextDayStart &&
          e.period <= nextDayEnd
      )
      .map((e) => e.hint);
    setGuaranteedEventWarnings(warnings);

    MusicController.stop();
    MusicController.setTrack('bird');
    setGoingToSchoolModalVisible(true);
  };

  const handleGoingToSchoolComplete = useCallback(async () => {
    setGoingToSchoolModalVisible(false);

    const nextPeriodCount =
      Math.floor(periodCount / periodsPerDay) * periodsPerDay + periodsPerDay;
    const maxPeriods = periodsPerDay * 5;

    if (nextPeriodCount >= maxPeriods) {
      MusicController.stop();
      router.push('/game-end');
      return;
    }

    resetDailyStats();
    dispatch(resetEarlySaleFlag());
    resetDailyJokerUsage(day + 1);
    resetDailyShopkeeper();
    startNewDay(periodsPerDay);
    MusicController.stop();
    router.replace('/(tabs)/market');
  }, [
    balance,
    day,
    stashedAmount,
    adoptionFee,
    difficultyLevel,
    jokers.length,
    totalCandiesSold,
    hasPlayedAllMinigames,
    trackGameCompleted,
    checkUnlockRequirements,
    resetDailyStats,
    resetDailyJokerUsage,
    startNewDay,
    setIsInitialized,
    periodCount,
    periodsPerDay,
    dispatch,
  ]);

  const handleSleepCancel = () => setSleepConfirmModalVisible(false);

  const options = useMemo(() => {
    const allOptions = [
      {
        id: 'study',
        title: 'Study',
        desc: hasStudiedTonight
          ? "You've already studied tonight!"
          : 'Earn jokers by studying',
        onPress: handleStudy,
        disabled: hasStudiedTonight,
      },
      {
        id: 'stash',
        title: 'Stash',
        desc: 'Deposit or withdraw cash',
        onPress: handleStashMoney,
        disabled: false,
      },
      {
        id: 'deli',
        title: 'Deli',
        desc: 'Corner store',
        onPress: handleGoDeli,
        disabled: false,
      },
      {
        id: 'sleep',
        title: 'Sleep',
        desc: 'Start a new day',
        onPress: handleGoToSleep,
        disabled: false,
      },
    ];

    const maxPeriods = periodsPerDay * 5;
    if (periodCount >= maxPeriods) {
      return allOptions.filter((o) => o.id !== 'sleep');
    }
    return allOptions;
  }, [
    hasStudiedTonight,
    handleStudy,
    handleStashMoney,
    handleGoDeli,
    handleGoToSleep,
    periodCount,
    periodsPerDay,
  ]);

  const study = options.find((o) => o.id === 'study');
  const stash = options.find((o) => o.id === 'stash');
  const deli = options.find((o) => o.id === 'deli');
  const sleep = options.find((o) => o.id === 'sleep');

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2a1845" />
      <FirstTimeHint
        hintKey="after_school"
        message="School's out! Study to earn Jokers, deposit money, visit the deli, or sleep to start a new day."
      />

      {showStash ? (
        <PiggyBankPage onBack={() => setShowStash(false)} />
      ) : showDeli ? (
        <DeliPage onBack={() => setShowDeli(false)} />
      ) : (
        <ImageBackground
          source={require('../../assets/images/evening-street.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <GameHUD
            theme="evening"
            customHeaderText={`After School - Day ${day}`}
            customLocationText="Home"
            onInventoryPress={() => setShowInventory(true)}
            showLunchMinigames={false}
          />

          {showStudySubjects && !hasStudiedTonight ? (
            isFocused && (
              <View style={{ flex: 1 }}>
                <StudySubjectSelector
                  onBack={handleBackToOptions}
                  disabled={false}
                />
              </View>
            )
          ) : (
            <View style={styles.puzzleGrid}>
              {/* Row: Study (left, wide) + Sleep (right, full height) */}
              <View style={styles.puzzleRow}>
                <View style={styles.leftCol}>
                  {/* Study — top, taller */}
                  {study && (
                    <PuzzleTile item={study} style={styles.studyTile} />
                  )}
                  {/* Bottom row: Stash + Deli */}
                  <View style={styles.bottomRow}>
                    {stash && (
                      <PuzzleTile item={stash} style={styles.stashTile} />
                    )}
                    {deli && <PuzzleTile item={deli} style={styles.deliTile} />}
                  </View>
                </View>
                {/* Sleep — right column, full height */}
                {sleep && <PuzzleTile item={sleep} style={styles.sleepTile} />}
              </View>
            </View>
          )}
        </ImageBackground>
      )}

      <SleepConfirmModal
        visible={sleepConfirmModalVisible}
        onConfirm={handleSleepConfirm}
        onCancel={handleSleepCancel}
        currentDay={day}
      />
      <GoingToSchoolModal
        visible={goingToSchoolModalVisible}
        allowanceAmount={allowanceAmount}
        onComplete={handleGoingToSchoolComplete}
        guaranteedEventWarnings={guaranteedEventWarnings}
      />
      {showInventory && (
        <Suspense fallback={null}>
          <InventoryModal
            visible={showInventory}
            onClose={() => setShowInventory(false)}
            inventory={inventory}
            totalCount={getTotalInventoryCount()}
            capacity={getInventoryLimit()}
          />
        </Suspense>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.purple.darkBg,
  },
  backgroundImage: {
    flex: 1,
  },

  // --- Puzzle grid layout ---
  puzzleGrid: {
    flex: 1,
    padding: 8,
  },
  puzzleRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  leftCol: {
    flex: 1.7,
    gap: 4,
  },
  bottomRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  studyTile: {
    flex: 1.2,
  },
  stashTile: {
    flex: 1,
  },
  deliTile: {
    flex: 1.2,
  },
  sleepTile: {
    flex: 1,
  },

  // --- Tile internals ---
  tile: {
    overflow: 'hidden',
  },
  tileContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  tileIcon: {
    width: 70,
    height: 70,
    marginBottom: 4,
  },
  tileTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gold.light,
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0,0,0,1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 2,
  },
  tileSub: {
    fontSize: 14,
    color: colors.white,
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    lineHeight: 16,
  },
  disabledText: {
    color: 'rgba(200, 180, 220, 1)',
  },
  disabledIcon: {
    opacity: 1,
  },
});

export default React.memo(AfterSchoolPage);
