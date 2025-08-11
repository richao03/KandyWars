import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import JokerSelection from '../components/JokerSelection';
import { ECONOMY_JOKERS } from '../../src/utils/jokerEffectEngine';

/** =========================
 *  Types
 *  ========================= */
type Item = 'Chocolate' | 'Lollipop' | 'Cookie' | 'Cake' | 'Candy' | 'Donut' | 'Cupcake';
type Inventory = Partial<Record<Item, number>>;
type TradeTile = {
  id: string;
  give: Inventory;
  get: Inventory;
  label: string;    // "1 🍫 → 1 🍰"
  source: 'palette' | 'slot';
};
type Puzzle = {
  startInventory: Inventory;
  goal: Item;
  tiles: TradeTile[];
  steps: number;
};

interface EconomyGameProps {
  onComplete: () => void;
}

/** =========================
 *  Candy catalog
 *  ========================= */
const CATALOG: Record<Item, string> = {
  Chocolate: '🍫',
  Lollipop: '🍭',
  Cookie: '🍪',
  Cake: '🍰',
  Candy: '🍬',
  Donut: '🍩',
  Cupcake: '🧁',
};
const ALL_ITEMS: Item[] = Object.keys(CATALOG) as Item[];

// Economy Trading jokers

/** =========================
 *  Seeded RNG
 *  ========================= */
function strHash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function makePRNG(seedString: string) {
  return mulberry32(strHash32(seedString));
}
function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function pick<T>(rng: () => number, arr: T[], exclude: T[] = []): T {
  const pool = arr.filter(a => !exclude.includes(a));
  return pool[Math.floor(rng() * pool.length)];
}

/** =========================
 *  Inventory helpers
 *  ========================= */
function qty(n: number, it: Item) { return `${n} ${CATALOG[it]}`; }
function fmtInv(inv: Inventory): string {
  const parts: string[] = [];
  for (const [item, amount] of Object.entries(inv)) {
    if (!amount) continue;
    const it = item as Item;
    parts.push(qty(amount, it));
  }
  return parts.join(' + ');
}
function canAfford(inv: Inventory, cost: Inventory): boolean {
  return Object.entries(cost).every(([name, need]) => {
    const it = name as Item;
    return (inv[it] || 0) >= (need || 0);
  });
}
function applyTrade(inv: Inventory, trade: TradeTile): Inventory {
  const out: Inventory = { ...inv };
  for (const [name, amount] of Object.entries(trade.give)) {
    const it = name as Item;
    out[it] = (out[it] || 0) - (amount || 0);
    if ((out[it] || 0) <= 0) delete out[it];
  }
  for (const [name, amount] of Object.entries(trade.get)) {
    const it = name as Item;
    out[it] = (out[it] || 0) + (amount || 0);
  }
  return out;
}

/** =========================
 *  Generator (unique path)
 *  ========================= */
function generatePuzzle(seed: string, steps: number): Puzzle {
  const rng = makePRNG(`${seed}::steps=${steps}`);
  const goal: Item = pick(rng, ALL_ITEMS);
  let currentNeed: Inventory = { [goal]: 1 };

  const solution: { id: string; give: Inventory; get: Inventory; label: string }[] = [];
  const chainItems = new Set<Item>([goal]);

  for (let i = steps - 1; i >= 0; i--) {
    const needItem = Object.keys(currentNeed)[0] as Item;
    const needQty = currentNeed[needItem]!;
    const giveItem = pick(rng, ALL_ITEMS, [needItem]);
    const giveQty = randInt(rng, 1, 2);

    solution.unshift({
      id: `sol-${i}-${giveItem}->${needItem}`,
      give: { [giveItem]: giveQty },
      get: { [needItem]: needQty },
      label: `${qty(giveQty, giveItem)} → ${qty(needQty, needItem)}`,
    });

    chainItems.add(giveItem);
    currentNeed = { [giveItem]: giveQty };
  }

  const startInventory = currentNeed;
  const tiles: TradeTile[] = solution.map(t => ({ ...t, source: 'palette' }));
  const offPathItems = ALL_ITEMS.filter(i => !chainItems.has(i));

  for (let s = 0; s < steps; s++) {
    const sol = solution[s];
    const solGive = Object.keys(sol.give)[0] as Item;
    const solGiveQty = sol.give[solGive]!;
    const count = randInt(rng, 1, 2);
    for (let v = 0; v < count && offPathItems.length > 0; v++) {
      const outItem = pick(rng, offPathItems);
      if (outItem === goal) continue;
      
      // Prevent one-shot solutions: Check if this decoy would allow reaching goal directly
      const startHasGiveItem = (startInventory[solGive] || 0) >= solGiveQty;
      if (startHasGiveItem && outItem === goal) {
        continue; // Skip this decoy as it would create a one-shot solution
      }
      
      const getQty = randInt(rng, 1, 2);
      tiles.push({
        id: `d-${s}-${v}-${solGive}(${solGiveQty})->${outItem}(${getQty})`,
        give: { [solGive]: solGiveQty },
        get: { [outItem]: getQty },
        label: `${qty(solGiveQty, solGive)} → ${qty(getQty, outItem)}`,
        source: 'palette',
      });
    }
  }

  // shuffle deterministically
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }

  return { startInventory, goal, tiles, steps };
}

/** =========================
 *  Hit testing (absolute)
 *  ========================= */
type Rect = { x: number; y: number; w: number; h: number };
function inRect(px: number, py: number, r: Rect | null | undefined) {
  if (!r) return false;
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

/** =========================
 *  Per-item draggable components (Option A)
 *  ========================= */
type CommonDragProps = {
  tile: TradeTile;
  // shared overlay state
  dragX: Animated.SharedValue<number>;
  dragY: Animated.SharedValue<number>;
  dragScale: Animated.SharedValue<number>;
  // JS-thread helpers
  onStartJS: (tile: TradeTile) => void;
  onMoveJS: (x: number, y: number) => void;
};

type PaletteDragProps = CommonDragProps & {
  onEndFromPaletteJS: (tile: TradeTile, x: number, y: number) => void;
  style?: any;
};
function DraggableFromPalette({
  tile, dragX, dragY, dragScale, onStartJS, onMoveJS, onEndFromPaletteJS, style,
}: PaletteDragProps) {
  const gesture = useAnimatedGestureHandler({
    onStart: (e) => {
      dragX.value = e.absoluteX;
      dragY.value = e.absoluteY;
      dragScale.value = 1;
      runOnJS(onStartJS)(tile);
    },
    onActive: (e) => {
      dragX.value = e.absoluteX;
      dragY.value = e.absoluteY;
      runOnJS(onMoveJS)(e.absoluteX, e.absoluteY);
    },
    onEnd: (e) => {
      dragScale.value = 0;
      runOnJS(onEndFromPaletteJS)(tile, e.absoluteX, e.absoluteY);
      runOnJS(onMoveJS)(-1, -1); // clear hover
    },
  });

  return (
    <PanGestureHandler
      onGestureEvent={gesture}
      shouldCancelWhenOutside={false}
      activeOffsetX={[-10, 10]}
      activeOffsetY={[-10, 10]}
    >
      <Animated.View style={style}>
        <Text style={styles.tileLabel}>{tile.label}</Text>
      </Animated.View>
    </PanGestureHandler>
  );
}

type SlotDragProps = CommonDragProps & {
  slotIndex: number;
  onEndFromSlotJS: (slotIndex: number, tile: TradeTile, x: number, y: number) => void;
};
function DraggableFromSlot({
  tile, slotIndex, dragX, dragY, dragScale, onStartJS, onMoveJS, onEndFromSlotJS,
}: SlotDragProps) {
  const gesture = useAnimatedGestureHandler({
    onStart: (e) => {
      dragX.value = e.absoluteX;
      dragY.value = e.absoluteY;
      dragScale.value = 1;
      runOnJS(onStartJS)(tile);
    },
    onActive: (e) => {
      dragX.value = e.absoluteX;
      dragY.value = e.absoluteY;
      runOnJS(onMoveJS)(e.absoluteX, e.absoluteY);
    },
    onEnd: (e) => {
      dragScale.value = 0;
      runOnJS(onEndFromSlotJS)(slotIndex, tile, e.absoluteX, e.absoluteY);
      runOnJS(onMoveJS)(-1, -1);
    },
  });

  return (
    <PanGestureHandler
      onGestureEvent={gesture}
      shouldCancelWhenOutside={false}
      activeOffsetX={[-10, 10]}
      activeOffsetY={[-10, 10]}
    >
      <Animated.View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Text style={styles.slotLabel}>{tile.label}</Text>
      </Animated.View>
    </PanGestureHandler>
  );
}

/** =========================
 *  Component
 *  ========================= */
const LEVEL_SLOTS = [4, 5, 6];

export default function CandyTraderSequencer({ onComplete }: EconomyGameProps) {
  const [seed] = useState('candy-seed');
  const [gameState, setGameState] = useState('instructions'); // 'instructions', 'playing', 'jokerSelection'
  const [levelIndex, setLevelIndex] = useState(0);

  const [puzzle, setPuzzle] = useState<Puzzle>(() =>
    generatePuzzle(`${seed}::L${0}`, LEVEL_SLOTS[0])
  );
  const [slots, setSlots] = useState<(TradeTile | null)[]>(() => Array(puzzle.steps).fill(null));
  const [available, setAvailable] = useState<TradeTile[]>(puzzle.tiles);

  // measure refs
  const slotRefs = useRef<(View | null)[]>([]);
  const slotRects = useRef<Array<Rect | null>>(Array(puzzle.steps).fill(null));
  const paletteRef = useRef<View | null>(null);
  const paletteRect = useRef<Rect | null>(null);

  // floating drag overlay (position + scale)
  const [dragLabelText, setDragLabelText] = useState('');
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragScale = useSharedValue(0); // 0 = hidden, 1 = visible
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);

  const resetLevel = (level: number) => {
    const p = generatePuzzle(`${seed}::L${level}`, LEVEL_SLOTS[level]);
    setPuzzle(p);
    setSlots(Array(p.steps).fill(null));
    setAvailable(p.tiles);
    slotRefs.current = [];
    slotRects.current = Array(p.steps).fill(null);
    paletteRect.current = null;
  };
  
  // Force remeasure when slots or available tiles change
  React.useEffect(() => {
    const timer = setTimeout(() => {
      // Remeasure all slot positions
      slotRefs.current.forEach((ref, index) => {
        if (ref) {
          ref.measureInWindow((x: number, y: number, w: number, h: number) => {
            slotRects.current[index] = { x, y, w, h };
          });
        }
      });
      
      // Remeasure palette position
      if (paletteRef.current) {
        paletteRef.current.measureInWindow((x: number, y: number, w: number, h: number) => {
          paletteRect.current = { x, y, w, h };
        });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [slots, available]);

  const onSlotLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    // Use setTimeout to ensure layout is complete
    setTimeout(() => {
      const ref = slotRefs.current[index];
      if (ref) {
        ref.measureInWindow((absoluteX: number, absoluteY: number, w: number, h: number) => {
          slotRects.current[index] = { x: absoluteX, y: absoluteY, w, h };
        });
      }
    }, 0);
  };
  
  const onPaletteLayout = (_e: LayoutChangeEvent) => {
    setTimeout(() => {
      const ref = paletteRef.current;
      if (ref) {
        ref.measureInWindow((absoluteX: number, absoluteY: number, w: number, h: number) => {
          paletteRect.current = { x: absoluteX, y: absoluteY, w, h };
        });
      }
    }, 0);
  };

  /** ---------- placement helpers ---------- */
  const placeIntoSlot = (tile: TradeTile, idx: number) => {
    const occupying = slots[idx];
    setSlots(prev => {
      const copy = [...prev];
      copy[idx] = { ...tile, source: 'slot' };
      return copy;
    });
    setAvailable(prev => {
      const filtered = prev.filter(t => t.id !== tile.id);
      return occupying ? [...filtered, { ...occupying, source: 'palette' }] : filtered;
    });
  };
  const removeFromSlot = (i: number) => {
    const tile = slots[i];
    if (!tile) return;
    setSlots(prev => {
      const copy = [...prev];
      copy[i] = null;
      return copy;
    });
    setAvailable(prev => [...prev, { ...tile, source: 'palette' }]);
  };

  /** ---------- drag overlay ---------- */
  const overlayStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value - 48 }, // center on finger (half of 96px width)
      { translateY: dragY.value - 48 }, // center on finger (half of 96px height)
      { scale: dragScale.value ? withTiming(1.05, { duration: 150 }) : withTiming(0, { duration: 150 }) },
    ],
    opacity: dragScale.value ? withTiming(0.9, { duration: 150 }) : withTiming(0, { duration: 150 }),
  }));
  
  // JS helpers shared by all draggables
  const onStartJS = useCallback((tile: TradeTile) => {
    setHoveredSlotIndex(null);
    setDragLabelText(tile.label);
  }, []);
  const onMoveJS = useCallback((absX: number, absY: number) => {
    if (absX < 0 || absY < 0) { setHoveredSlotIndex(null); return; }
    const idx = slotRects.current.findIndex(r => inRect(absX, absY, r));
    setHoveredSlotIndex(idx >= 0 ? idx : null);
  }, []);

  /** ---------- Actions ---------- */
  const clearAll = () => {
    setSlots(Array(puzzle.steps).fill(null));
    setAvailable(puzzle.tiles);
  };

  const executePlan = () => {
    let inv: Inventory = { ...puzzle.startInventory };
    for (let i = 0; i < slots.length; i++) {
      const tile = slots[i];
      if (!tile) continue;
      if (!canAfford(inv, tile.give)) {
        Alert.alert('❌ Plan Failed', `Step ${i + 1} not affordable.\nTrade: ${tile.label}\nInv: ${fmtInv(inv) || 'Empty'}`);
        return;
      }
      inv = applyTrade(inv, tile);
    }
    const success = (inv[puzzle.goal] || 0) >= 1;
    if (success) {
      const isLast = levelIndex === LEVEL_SLOTS.length - 1;
      Alert.alert(
        '🎉 Congrats!',
        `✅ Reached 1 ${CATALOG[puzzle.goal]} ${puzzle.goal}\nStart: ${fmtInv(puzzle.startInventory) || 'Empty'}\nEnd: ${fmtInv(inv) || 'Empty'}`,
        [
          isLast
            ? { text: 'Choose Trade Tool', onPress: () => setGameState('jokerSelection') }
            : { text: 'Next Level ➡️', onPress: () => { const next = levelIndex + 1; setLevelIndex(next); resetLevel(next); } },
          { text: 'Close', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert('📉 Not There Yet', `❌ Did not reach 1 ${CATALOG[puzzle.goal]} ${puzzle.goal}\nEnd: ${fmtInv(inv) || 'Empty'}`);
    }
  };

  /** ---------- Drop logic (JS side) ---------- */
  const dropFromPalette = (tile: TradeTile, absX: number, absY: number) => {
    const idx = slotRects.current.findIndex(r => inRect(absX, absY, r));
    if (idx >= 0) {
      placeIntoSlot(tile, idx);
    }
  };
  
  const dropFromSlot = (slotIndex: number, tile: TradeTile, absX: number, absY: number) => {
    // Check if dropping on another slot (for swapping)
    const targetIdx = slotRects.current.findIndex(r => inRect(absX, absY, r));
    if (targetIdx >= 0 && targetIdx !== slotIndex) {
      // Swap slots
      setSlots(prev => {
        const copy = [...prev];
        const target = copy[targetIdx];
        copy[targetIdx] = { ...tile, source: 'slot' };
        copy[slotIndex] = target ? { ...target, source: 'slot' } : null;
        return copy;
      });
      return;
    }
    // Check if dropping back on palette area
    if (inRect(absX, absY, paletteRect.current)) {
      removeFromSlot(slotIndex);
      return;
    }
  };

  /** ---------- Render ---------- */
  const paletteTiles = useMemo(
    () => [...available].sort((a, b) => a.id.localeCompare(b.id)),
    [available]
  );

  const handleForfeit = () => {
    if (gameState === 'playing') {
      Alert.alert(
        '🏛️ Leave Trading Post?',
        "If you leave now, you\\'ll forfeit your chance to study tonight and won\\'t get a trade tool reward.",
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Back to Instructions', onPress: () => setGameState('instructions') },
          { 
            text: 'Leave', 
            style: 'destructive',
            onPress: () => router.back()
          }
        ]
      );
    } else {
      router.back();
    }
  };

  if (gameState === 'jokerSelection') {
    return (
      <JokerSelection 
        jokers={ECONOMY_JOKERS}
        theme="economy"
        subject="Economy"
        onComplete={onComplete}
      />
    );
  }

  if (gameState === 'instructions') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>💼 Economics Study Session! 📈</Text>
            
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsHeader}>📊 How to Trade:</Text>
              <View style={styles.instructionStep}>
                <Text style={styles.stepNumber}>1.</Text>
                <Text style={styles.stepText}>Drag trade tiles from the palette to plan your route</Text>
              </View>
              <View style={styles.instructionStep}>
                <Text style={styles.stepNumber}>2.</Text>
                <Text style={styles.stepText}>Each tile shows what you give and what you get</Text>
              </View>
              <View style={styles.instructionStep}>
                <Text style={styles.stepNumber}>3.</Text>
                <Text style={styles.stepText}>Arrange trades in sequence to reach your goal item</Text>
              </View>
              <View style={styles.instructionStep}>
                <Text style={styles.stepNumber}>4.</Text>
                <Text style={styles.stepText}>Execute your plan to see if it works!</Text>
              </View>
              <View style={styles.instructionStep}>
                <Text style={styles.stepNumber}>5.</Text>
                <Text style={styles.stepText}>Complete all 3 levels of increasing complexity</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.startGameButton} 
              onPress={() => setGameState('playing')}
            >
              <Text style={styles.startGameButtonText}>💼 Start Trading Challenge!</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.startGameButton} onPress={handleForfeit}>
              <Text style={styles.startGameButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>💱 Barter Trading</Text>
          <Text style={styles.subtitle}>
            Level {levelIndex + 1} / {LEVEL_SLOTS.length} • Slots: {puzzle.steps}
          </Text>
        </View>

        {/* HUD */}
        <View style={styles.hud}>
          <View style={styles.hudSection}>
            <Text style={styles.hudLabel}>Start</Text>
            <Text style={styles.hudValue}>{fmtInv(puzzle.startInventory) || 'Empty'}</Text>
          </View>
          <View style={styles.hudSection}>
            <Text style={styles.hudLabel}>Goal</Text>
            <Text style={styles.hudValue}>{CATALOG[puzzle.goal]} {puzzle.goal}</Text>
          </View>
        </View>

        {/* Slots */}
        <View style={styles.slotsWrapper}>
          <Text style={styles.sectionTitle}>Arrange your plan (drag into slots)</Text>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.slotsScrollContent}
          >
            <View style={styles.slotsRow}>
              {slots.map((slot, i) => (
                <View
                  key={`slot-${i}`}
                  ref={el => (slotRefs.current[i] = el)}
                  style={[
                    styles.slot, 
                    !!slot && styles.slotFilled,
                    hoveredSlotIndex === i && styles.slotHighlighted
                  ]}
                  onLayout={onSlotLayout(i)}
                >
                  {slot ? (
                    <DraggableFromSlot
                      tile={slot}
                      slotIndex={i}
                      dragX={dragX}
                      dragY={dragY}
                      dragScale={dragScale}
                      onStartJS={onStartJS}
                      onMoveJS={onMoveJS}
                      onEndFromSlotJS={dropFromSlot}
                    />
                  ) : (
                    <Text style={styles.slotPlaceholder}>{i+1}</Text>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Palette */}
        <View 
          ref={paletteRef} 
          style={styles.paletteWrapper} 
          onLayout={onPaletteLayout}
        >
          <Text style={styles.sectionTitle}>Available Trades</Text>
          <View style={styles.paletteGrid}>
            {paletteTiles.map(tile => (
              <DraggableFromPalette
                key={tile.id}
                tile={tile}
                dragX={dragX}
                dragY={dragY}
                dragScale={dragScale}
                onStartJS={onStartJS}
                onMoveJS={onMoveJS}
                onEndFromPaletteJS={dropFromPalette}
                style={styles.tile}
              />
            ))}
            {paletteTiles.length === 0 && (
              <View style={styles.emptyPaletteContainer}>
                <Text style={styles.emptyPaletteText}>All tiles placed!</Text>
                <Text style={styles.emptyPaletteSubtext}>Drag tiles back here to remove them</Text>
              </View>
            )}
          </View>
        </View>

        {/* Execute Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.footerBtn, styles.footerPrimary]} onPress={executePlan}>
            <Text style={styles.footerPrimaryText}>💼 Execute Trade Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.footerBtn, styles.footerSecondary]} onPress={clearAll}>
            <Text style={styles.footerSecondaryText}>🔄 Clear</Text>
          </TouchableOpacity>
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.footerBtn, styles.footerSecondary]} onPress={() => setGameState('instructions')}>
            <Text style={styles.footerSecondaryText}>📋 Instructions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.footerBtn, styles.footerBack]} onPress={handleForfeit}>
            <Text style={styles.footerBackText}>🚪 Leave</Text>
          </TouchableOpacity>
        </View>

        {/* Floating drag overlay */}
        <Animated.View pointerEvents="none" style={[styles.dragOverlay, overlayStyle]}>
          <View style={styles.dragOverlayCard}>
            <Text style={styles.dragOverlayText}>{dragLabelText}</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </GestureHandlerRootView>
  );
}

/** =========================
 *  Styles
 *  ========================= */
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0a1929'
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    paddingBottom: 100,
  },
  header: { 
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#1e3a8a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'CrayonPastel',
    marginBottom: 8,
    textShadowColor: '#2196f3',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: { 
    fontSize: 16, 
    color: '#42a5f5',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },

  hud: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 16, 
    backgroundColor: '#1e3a8a',
    borderWidth: 3, 
    borderColor: '#2196f3',
    borderRadius: 16, 
    marginBottom: 16,
    shadowColor: '#2196f3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  hudSection: { 
    flex: 1, 
    alignItems: 'center' 
  },
  hudLabel: { 
    fontSize: 12, 
    color: '#90caf9',
    fontFamily: 'CrayonPastel',
    marginBottom: 4,
    fontWeight: '600'
  },
  hudValue: { 
    fontSize: 16, 
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'CrayonPastel',
    textShadowColor: '#2196f3',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  slotsWrapper: { marginBottom: 16 },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700',
    color: '#2196f3',
    fontFamily: 'CrayonPastel',
    marginBottom: 12,
    textShadowColor: '#1976d2',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  slotsScrollContent: {
    paddingHorizontal: 8,
  },
  slotsRow: { 
    flexDirection: 'row', 
    gap: 8,
  },
  slot: { 
    width: 88,
    height: 44 ,
    borderWidth: 3, 
    borderColor: '#1565c0',
    borderRadius: 12, 
    padding: 8, 
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d47a1',
    shadowColor: '#2196f3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  slotFilled: { 
    backgroundColor: '#1976d2', 
    borderColor: '#42a5f5',
    shadowColor: '#2196f3',
    shadowOpacity: 0.5,
  },
  slotHighlighted: {
    backgroundColor: '#1e88e5',
    borderColor: '#64b5f6',
    borderWidth: 4,
    shadowColor: '#2196f3',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  slotPlaceholder: { 
    textAlign: 'center', 
    color: '#90caf9',
    fontFamily: 'CrayonPastel',
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  slotLabel: { 
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    fontSize: 13,
    textShadowColor: '#1976d2',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  slotHint: { 
    fontSize: 8, 
    color: '#90caf9',
    fontFamily: 'CrayonPastel',
    textAlign: 'center', 
    marginTop: 2 
  },

  paletteWrapper: { marginBottom: 16 },
  paletteGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  tile: { 
    width: 96,
    height: 48,
    borderWidth: 3, 
    borderColor: '#42a5f5',
    borderRadius: 12, 
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1565c0',
    shadowColor: '#2196f3',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  tileLabel: { 
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    fontSize: 13,
    textShadowColor: '#1976d2',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  tileHint: { 
    fontSize: 8, 
    color: '#90caf9',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginTop: 2,
  },
  emptyPaletteContainer: {
    width: '100%',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0d47a1',
    borderWidth: 2,
    borderColor: '#42a5f5',
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  emptyPaletteText: { 
    color: '#64b5f6',
    fontFamily: 'CrayonPastel',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 16,
  },
  emptyPaletteSubtext: {
    color: '#90caf9',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 4,
  },
  footer: { 
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 16,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  footerBtn: { 
    flex: 1, 
    paddingVertical: 12, 
    borderWidth: 3, 
    borderRadius: 16, 
    alignItems: 'center',
  },
  footerPrimary: { 
    borderColor: '#1976d2', 
    backgroundColor: '#2196f3',
    shadowColor: '#2196f3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  footerPrimaryText: { 
    fontWeight: '700', 
    color: '#ffffff',
    fontFamily: 'CrayonPastel',
    textShadowColor: '#1976d2',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  footerSecondary: { 
    borderColor: '#42a5f5', 
    backgroundColor: '#1565c0' 
  },
  footerSecondaryText: { 
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },
  footerBack: {
    borderColor: '#42a5f5',
    backgroundColor: '#1565c0',
  },
  footerBackText: {
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
  },

  // Floating overlay
  dragOverlay: { 
    position: 'absolute', 
    left: 0, 
    top: 0, 
    width: 96,
    height: 96,
    zIndex: 999,
    pointerEvents: 'none',
  },
  dragOverlayCard: { 
    width: 96,
    height: 96,
    padding: 8,
    borderRadius: 12, 
    borderWidth: 3, 
    borderColor: '#64b5f6', 
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2196f3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 15,
  },
  dragOverlayText: { 
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'CrayonPastel',
    fontSize: 13,
    textAlign: 'center',
    textShadowColor: '#1976d2',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Instructions Styles
  instructionsContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#0a1929',
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2196f3',
    fontFamily: 'CrayonPastel',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#1976d2',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  instructionsCard: {
    backgroundColor: '#1e3a8a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: '#42a5f5',
    marginBottom: 20,
    shadowColor: '#2196f3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  instructionsHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64b5f6',
    fontFamily: 'CrayonPastel',
    marginBottom: 15,
    textAlign: 'center',
    textShadowColor: '#2196f3',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#42a5f5',
    fontFamily: 'CrayonPastel',
    marginRight: 10,
    minWidth: 20,
  },
  stepText: {
    fontSize: 16,
    color: '#ffffff',
    fontFamily: 'CrayonPastel',
    flex: 1,
    lineHeight: 22,
  },
  startGameButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#1976d2',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2196f3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  startGameButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'CrayonPastel',
    textShadowColor: '#1976d2',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
