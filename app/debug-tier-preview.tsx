import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  computeBigSaleFX,
  EDGE_LIGHT_PALETTES,
} from '../src/utils/computeBigSaleFX';
import type { Candy } from '../src/types/candy';
import PixelBorder from './components/PixelBorder';
import TransactionModal from './components/TransactionModal';

interface TierPreset {
  label: string;
  emoji: string;
  totalGain: number;
  purchaseValue: number;
  /** Number of synthetic flat-bonus jokers to show. */
  boostCount: number;
  /** Number of synthetic multiplier jokers to show. */
  multCount: number;
  /** Largest synthetic multiplier value. */
  maxMult: number;
  description: string;
}

// Joker names that exist in JOKER_ICON_MAP — used as labels for the synthetic
// scoring steps so each preview shows real joker icons in the cascade.
const SYNTH_BOOST_JOKERS: Array<{ name: string; emoji: string }> = [
  { name: 'Bake Sale', emoji: '🧁' },
  { name: 'Tapped in', emoji: '⚡' },
  { name: 'Treasure Chest', emoji: '🪙' },
  { name: 'Home Made', emoji: '🍪' },
];
const SYNTH_MULT_JOKERS: Array<{ name: string; emoji: string }> = [
  { name: 'Double Up', emoji: '🎲' },
  { name: 'Combo Platter', emoji: '🍱' },
  { name: 'Triple Threat', emoji: '🎯' },
  { name: 'Flip Artist', emoji: '🔄' },
  { name: 'Bulk Empire', emoji: '🍲' },
];

// One preset per stop in computeSparkScale (9 total). purchaseValue is tuned
// per row to keep ratio (totalGain/purchaseValue) under 10 so the ratio
// override doesn't sweep the spark-arc tier up to sapphire/jackpot.
const TIER_PRESETS: TierPreset[] = [
  {
    label: 'Stop 1 ($250) — Muted Green',
    emoji: '🌱',
    totalGain: 250,
    purchaseValue: 50,
    boostCount: 0,
    multCount: 0,
    maxMult: 1,
    description: '3 sparks, muted greens',
  },
  {
    label: 'Stop 2 ($1,000) — Bright Green',
    emoji: '🥬',
    totalGain: 1000,
    purchaseValue: 200,
    boostCount: 1,
    multCount: 1,
    maxMult: 1.5,
    description: '6 sparks, bright greens',
  },
  {
    label: 'Stop 3 ($3,000) — Emerald',
    emoji: '💚',
    totalGain: 3000,
    purchaseValue: 400,
    boostCount: 1,
    multCount: 2,
    maxMult: 2,
    description: '10 sparks, emerald palette',
  },
  {
    label: 'Stop 4 ($7,500) — Teal',
    emoji: '🩵',
    totalGain: 7500,
    purchaseValue: 800,
    boostCount: 2,
    multCount: 3,
    maxMult: 3,
    description: '14 sparks, teal — shake kicks in (≥$6k)',
  },
  {
    label: 'Stop 5 ($15k) — Sky Blue',
    emoji: '💙',
    totalGain: 15000,
    purchaseValue: 1700,
    boostCount: 3,
    multCount: 3,
    maxMult: 4,
    description: '20 sparks, sky blue — magenta edge lights (≥$15k)',
  },
  {
    label: 'Stop 6 ($25k) — Royal Blue',
    emoji: '🔵',
    totalGain: 25000,
    // Just below the absolute jackpot ladder (≥30k → jackpot tier) so the
    // arcs stay sapphire while sparkScale lands in the royal-blue stop.
    purchaseValue: 2900,
    boostCount: 3,
    multCount: 4,
    maxMult: 5,
    description: '26 sparks, royal blue',
  },
  {
    label: 'Stop 7 ($50k) — Purple',
    emoji: '💜',
    totalGain: 50000,
    purchaseValue: 6000,
    boostCount: 4,
    multCount: 4,
    maxMult: 6,
    description: '34 sparks, purple/violet',
  },
  {
    label: 'Stop 8 ($80k) — Pink/Gold',
    emoji: '💖',
    totalGain: 80000,
    purchaseValue: 9000,
    boostCount: 4,
    multCount: 4,
    maxMult: 7,
    description: '42 sparks, pink/gold',
  },
  {
    label: 'Stop 9 ($100k+) — Gold/Red',
    emoji: '💎',
    totalGain: 100000,
    purchaseValue: 12000,
    boostCount: 4,
    multCount: 4,
    maxMult: 8,
    description: '50 sparks, gold/red — top stop',
  },
];

const SYNTH_CANDY: Candy & {
  cost: number;
  quantityOwned: number;
  averagePrice: number | null;
} = {
  name: 'Gummy Bears',
  cost: 50,
  quantityOwned: 100,
  averagePrice: 5,
  baseMin: 1,
  baseMax: 10,
  types: ['gummy', 'chewy'],
  size: 'small',
};

function buildSyntheticSaleResult(preset: TierPreset) {
  const purchaseValue = preset.purchaseValue;
  const totalGain = preset.totalGain;

  // The cascade UI computes:
  //   runningProfit = baseProfit + sum(flatBonuses)
  //   runningMult   = 1 + sum(mult_i - 1)
  //   displayFinal  = runningProfit * runningMult
  //   displayTotal  = displayFinal + purchaseValue
  // For displayTotal to land at totalGain at the end of the cascade we need:
  //   runningProfit_end = (totalGain - purchaseValue) / maxMult
  //   runningMult_end   = maxMult
  // We split that target profit between the synthesized baseProfit and the
  // sum of flatBonuses contributed by the boost jokers.
  const targetRunningProfit = Math.max(
    0,
    (totalGain - purchaseValue) / Math.max(1, preset.maxMult)
  );
  const hasBoosts = preset.boostCount > 0;
  // 30% of the target comes from the base profit; 70% from boost jokers.
  // (When there are no boost jokers, the base profit covers the whole target.)
  const baseProfit = hasBoosts
    ? targetRunningProfit * 0.3
    : targetRunningProfit;
  const sumBoosts = hasBoosts ? targetRunningProfit - baseProfit : 0;
  const perBoost = hasBoosts ? sumBoosts / preset.boostCount : 0;

  const boosts = SYNTH_BOOST_JOKERS.slice(0, preset.boostCount).map((j) => ({
    emoji: j.emoji,
    name: j.name,
    multiplier: 1,
    flatBonus: Math.round(perBoost),
  }));

  // Multiplier jokers: cascade adds (multiplier - 1) per step. Distribute
  // increments with weights (1, 2, ..., N) so they sum to maxMult - 1 and
  // later jokers contribute visibly bigger jumps without overshooting.
  const totalIncrement = Math.max(0, preset.maxMult - 1);
  const sumWeights = (preset.multCount * (preset.multCount + 1)) / 2;
  const mults = SYNTH_MULT_JOKERS.slice(0, preset.multCount).map((j, i) => {
    const weight = i + 1;
    const increment =
      sumWeights > 0 ? (totalIncrement * weight) / sumWeights : 0;
    return {
      emoji: j.emoji,
      name: j.name,
      multiplier: 1 + increment,
    };
  });

  return {
    totalGain,
    profitPerUnit: baseProfit / 10,
    // baseProfit is the pre-bonus profit shown before the cascade kicks in.
    // The cascade ticks runningProfit up from this value as boosts fire.
    totalProfit: baseProfit,
    purchaseValue,
    hallPassBonus: 0,
    jokerMultiplier: preset.maxMult,
    vacuumSealerPenalty: 0,
    bonusBreakdown: [...boosts, ...mults],
  };
}

export default function DebugTierPreview() {
  const [activePreset, setActivePreset] = useState<TierPreset | null>(null);

  const debugSaleOverride = activePreset
    ? {
        saleResult: buildSyntheticSaleResult(activePreset),
        candy: SYNTH_CANDY,
      }
    : undefined;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>🎨 Sale Tier Preview</Text>
        <Text style={styles.subtitle}>
          Tap a tier to open the transaction modal at that scenario, then tap
          Sell to see the scoring cascade + screen FX.
        </Text>

        {TIER_PRESETS.map((preset, idx) => {
          const bigFX = computeBigSaleFX(preset.totalGain);
          return (
            <PixelBorder
              key={idx}
              borderColor="#a855f7"
              borderWidth={3}
              backgroundColor="#f3e8ff"
              innerPadding={0}
              style={styles.buttonWrapper}
            >
              <TouchableOpacity
                style={styles.button}
                onPress={() => setActivePreset(preset)}
              >
                <View style={styles.row}>
                  <Text style={styles.buttonText}>
                    {preset.emoji} {preset.label}
                  </Text>
                  <Text style={styles.particleCount}>
                    {preset.boostCount + preset.multCount} jokers
                  </Text>
                </View>
                <Text style={styles.description}>{preset.description}</Text>
                {bigFX.edgeLights !== 'none' && (
                  <View style={styles.fxRow}>
                    <Text style={styles.fxLabel}>edge:</Text>
                    {EDGE_LIGHT_PALETTES[bigFX.edgeLights].map((c, i) => (
                      <View
                        key={`${idx}-edge-${i}`}
                        style={[styles.swatch, { backgroundColor: c }]}
                      />
                    ))}
                  </View>
                )}
                <View style={styles.fxFlags}>
                  <Text
                    style={[
                      styles.fxFlag,
                      bigFX.shake ? styles.fxOn : styles.fxOff,
                    ]}
                  >
                    shake {bigFX.shake ? '✓' : '·'}
                  </Text>
                  <Text
                    style={[
                      styles.fxFlag,
                      bigFX.edgeLights !== 'none' ? styles.fxOn : styles.fxOff,
                    ]}
                  >
                    edge {bigFX.edgeLights !== 'none' ? '✓' : '·'}
                  </Text>
                </View>
              </TouchableOpacity>
            </PixelBorder>
          );
        })}

        <PixelBorder
          borderColor="#ef4444"
          borderWidth={3}
          backgroundColor="#fee2e2"
          innerPadding={0}
          style={styles.buttonWrapper}
        >
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={[styles.buttonText, { color: '#cc3333' }]}>← Back</Text>
          </TouchableOpacity>
        </PixelBorder>
      </ScrollView>

      <TransactionModal
        visible={activePreset !== null}
        onClose={() => setActivePreset(null)}
        // Hold the modal open for 3s after the scoring climax completes so
        // there's time to see the screen shake / edge lights play out fully
        // before the modal unmounts.
        onConfirm={() => {
          setTimeout(() => setActivePreset(null), 3000);
        }}
        maxBuyQuantity={0}
        maxSellQuantity={SYNTH_CANDY.quantityOwned}
        candy={SYNTH_CANDY}
        playerBalance={9999}
        availableInventorySpace={50}
        saleInputs={null}
        debugSaleOverride={debugSaleOverride}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#cbd5e1',
    fontFamily: 'PixeloidMono',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  buttonWrapper: {
    marginBottom: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#581c87',
    fontFamily: 'PixeloidMono',
  },
  particleCount: {
    fontSize: 12,
    color: '#7c3aed',
    fontFamily: 'PixeloidMono',
  },
  description: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'PixeloidMono',
    marginTop: 4,
  },
  swatch: {
    width: 22,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  fxRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
    alignItems: 'center',
  },
  fxLabel: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'PixeloidMono',
    marginRight: 4,
  },
  fxFlags: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  fxFlag: {
    fontSize: 11,
    fontFamily: 'PixeloidMono',
  },
  fxOn: {
    color: '#16a34a',
  },
  fxOff: {
    color: '#94a3b8',
  },
});
