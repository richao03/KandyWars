import React, { useMemo } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useAppSelector } from '../../src/store/hooks';
import {
  selectAdoptionFee,
  selectBalance,
  selectStashHistory,
  selectStashedAmount,
} from '../../src/store/slices/walletSlice';
import { formatCurrency } from '../../src/utils/priceUtils';
import FastModal from './FastModal';
import PixelBorder from './PixelBorder';
import TextWithEmojis from './TextWithEmojis';

interface PiggyBankDetailModalProps {
  visible: boolean;
  onClose: () => void;
}

const CARD_MAX_WIDTH = 400;

/**
 * Detail view for the HUD Piggy Bank pill. Presented as a centered card modal
 * (FastModal) with pixel-art borders, mirroring the Candy Stash modal. Shows
 * progress toward the adoption-fee goal and a per-day deposit bar chart.
 */
const PiggyBankDetailModal = React.memo(function PiggyBankDetailModal({
  visible,
  onClose,
}: PiggyBankDetailModalProps) {
  const balance = useAppSelector(selectBalance);
  const stashedAmount = useAppSelector(selectStashedAmount);
  const adoptionFee = useAppSelector(selectAdoptionFee);
  const stashHistory = useAppSelector(selectStashHistory);

  const netWorth = balance + stashedAmount;
  const goal = adoptionFee;
  const progressPct =
    goal > 0 ? Math.max(0, Math.min(100, (netWorth / goal) * 100)) : 0;
  const toGo = Math.max(0, goal - netWorth);
  const reached = netWorth >= goal;

  // Sum deposits per day for the bar chart.
  const chart = useMemo(() => {
    const byDay = new Map<number, number>();
    for (const e of stashHistory) {
      byDay.set(e.day, (byDay.get(e.day) ?? 0) + e.amount);
    }
    const days = Array.from(byDay.keys()).sort((a, b) => a - b);
    return {
      labels: days.map((d) => `Day ${d}`),
      data: days.map((d) => Math.round(byDay.get(d) ?? 0)),
    };
  }, [stashHistory]);

  const hasDeposits = chart.data.length > 0;
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = Math.min(CARD_MAX_WIDTH, screenWidth - 20);
  const chartWidth = cardWidth - 64; // minus pixel-border + inner-card padding

  return (
    <FastModal
      visible={visible}
      onClose={onClose}
      animationType="spring"
      backdropOpacity={0.6}
      modalStyle={styles.modalWrapper}
    >
      <PixelBorder
        borderColor="#b85c8a"
        borderWidth={3}
        backgroundColor="#fff6fb"
        innerPadding={16}
      >
        <View style={styles.titleContainer}>
          <TextWithEmojis style={styles.titleEmoji} imageSize={44}>
            🐷
          </TextWithEmojis>
        </View>
        <Text style={styles.title}>Piggy Bank</Text>
        <Text style={styles.subtitle}>Goal: ${formatCurrency(goal)}</Text>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Progress to goal */}
          <PixelBorder
            borderColor="#e6b7d0"
            borderWidth={3}
            backgroundColor="#fffafd"
            innerPadding={12}
          >
            <Text style={styles.cardLabel}>Progress to Goal</Text>
            <Text style={styles.bigPct}>{Math.round(progressPct)}%</Text>
            <View style={styles.progressBarBg}>
              <View
                style={[styles.progressBarFill, { width: `${progressPct}%` }]}
              />
            </View>
            <Text style={styles.toGoText}>
              {reached ? '🎉 Goal reached!' : `$${formatCurrency(toGo)} to go`}
            </Text>
          </PixelBorder>

          {/* Money breakdown */}
          <PixelBorder
            borderColor="#e6b7d0"
            borderWidth={3}
            backgroundColor="#fffafd"
            innerPadding={12}
          >
            <View style={styles.row}>
              <Text style={styles.rowLabel}>🐷 Piggy Bank</Text>
              <Text style={styles.rowValue}>
                ${formatCurrency(Math.max(0, stashedAmount))}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>💰 Wallet</Text>
              <Text style={styles.rowValue}>${formatCurrency(balance)}</Text>
            </View>
            <View style={[styles.row, styles.rowTotal]}>
              <Text style={styles.rowLabelTotal}>Net Worth</Text>
              <Text style={styles.rowValueTotal}>
                ${formatCurrency(netWorth)}
              </Text>
            </View>
          </PixelBorder>

          {/* Deposits by day */}
          <Text style={styles.sectionLabel}>Deposits by Day</Text>
          {hasDeposits ? (
            <BarChart
              data={{
                labels: chart.labels,
                datasets: [{ data: chart.data }],
              }}
              width={chartWidth}
              height={200}
              yAxisLabel="$"
              yAxisSuffix=""
              fromZero
              showValuesOnTopOfBars
              withInnerLines={false}
              chartConfig={{
                backgroundGradientFrom: '#fff6fb',
                backgroundGradientTo: '#fff6fb',
                decimalPlaces: 0,
                barPercentage: 0.55,
                color: (opacity = 1) => `rgba(184, 92, 138, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 68, 35, ${opacity})`,
                propsForBackgroundLines: { stroke: 'transparent' },
              }}
              style={styles.chart}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No deposits yet!</Text>
            </View>
          )}
        </ScrollView>

        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.8}
          style={styles.closeButtonWrap}
        >
          <PixelBorder
            borderColor="#9c4a73"
            borderWidth={3}
            backgroundColor="#b85c8a"
            innerPadding={0}
          >
            <View style={styles.closeButtonInner}>
              <Text style={styles.closeButtonText}>Close</Text>
            </View>
          </PixelBorder>
        </TouchableOpacity>
      </PixelBorder>
    </FastModal>
  );
});

export default PiggyBankDetailModal;

const styles = StyleSheet.create({
  modalWrapper: {
    backgroundColor: 'transparent',
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    alignSelf: 'center',
    shadowOpacity: 0,
    elevation: 0,
  },
  titleContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  titleEmoji: {
    fontSize: 40,
    textAlign: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    color: '#b85c8a',
    fontFamily: 'PixeloidMono',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#8b6b78',
    marginBottom: 12,
    fontFamily: 'PixeloidMono',
  },
  scrollView: {
    maxHeight: 420,
  },
  scrollContent: {
    gap: 14,
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    color: '#8b6b78',
    marginBottom: 6,
  },
  bigPct: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'PixeloidMono',
    color: '#b85c8a',
    textAlign: 'center',
  },
  progressBarBg: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#f0dce6',
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 7,
    backgroundColor: '#22c55e',
  },
  toGoText: {
    fontSize: 15,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    color: '#6b4423',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    color: '#6b4423',
  },
  rowValue: {
    fontSize: 14,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    color: '#6b4423',
  },
  rowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e6b7d0',
    marginTop: 4,
    paddingTop: 8,
  },
  rowLabelTotal: {
    fontSize: 15,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    color: '#b85c8a',
  },
  rowValueTotal: {
    fontSize: 16,
    fontFamily: 'PixeloidMono',
    fontWeight: '900',
    color: '#b85c8a',
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    color: '#8b6b78',
  },
  chart: {
    borderRadius: 8,
    marginLeft: -8,
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#b85c8a',
    fontFamily: 'PixeloidMono',
    fontWeight: '600',
    textAlign: 'center',
  },
  closeButtonWrap: {
    marginTop: 14,
  },
  closeButtonInner: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    fontFamily: 'PixeloidMono',
  },
});
