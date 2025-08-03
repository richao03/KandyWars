import React, { useState } from 'react';
import { Button, FlatList, StyleSheet, Text, View } from 'react-native';
import { Candy, generateCandyPriceTable } from '../../utils/generateCandyPriceTable';
import { useSeed } from '../context/SeedContext';
import { useWallet } from '../context/WalletContext';

type CandyForMarket = Candy & {
  cost: number;
  quantityOwned: number;
  averagePrice: number | null;
};

const baseCandies: Candy[] = [
  { name: 'Snickers', baseMin: 1.5, baseMax: 3 },
  { name: 'M&Ms', baseMin: 1.0, baseMax: 2.5 },
  { name: 'Skittles', baseMin: 0.75, baseMax: 2.25 },
  { name: 'Warheads', baseMin: 0.25, baseMax: 1.0 },
  { name: 'Sour Patch Kids', baseMin: 1.0, baseMax: 2.75 },
  { name: 'Bubble Gum', baseMin: 0.1, baseMax: 0.5 },
];


export default function Market() {

  const { rng, seed } = useSeed();
  const priceTable = generateCandyPriceTable(seed, baseCandies);

  const [period, setPeriod] = useState(0);
  const { balance, spend, add } = useWallet();
  const [candies, setCandies] = useState<CandyForMarket[]>(() =>
    baseCandies.map((candy) => {
      console.log("what is candy", candy)
      return ({
        ...candy,
        cost: priceTable[candy.name][period],
        quantityOwned: 0,
        averagePrice: null,
      })
    })
  );


  const price = Math.floor(rng() * 100) + 1;
  console.log("what is price", price)

  const handleBuy = (index: number) => {
    const price = candies[index].cost;
    if (!spend(price)) {
      alert("Not enough money!");
      return;
    }

    setCandies((prev) =>
      prev.map((candy, i) =>
        i === index
          ? {
            ...candy,
            quantityOwned: candy.quantityOwned + 1,
            averagePrice: candy.averagePrice === null
              ? candy.cost
              : (candy.averagePrice * candy.quantityOwned + candy.cost) / (candy.quantityOwned + 1),
          }
          : candy
      )
    );
  };

  const handleSell = (index: number) => {
    setCandies((prev) =>
      prev.map((candy, i) =>
        i === index && candy.quantityOwned > 0
          ? {
            ...candy,
            quantityOwned: candy.quantityOwned - 1,
            averagePrice:
              candy.quantityOwned === 1
                ? null
                : ((candy.averagePrice! * candy.quantityOwned - candy.cost) / (candy.quantityOwned - 1)),
          }
          : candy
      )
    );
    add(candies[index].cost); // Instant resale at current price
  };


  const handleNextDay = () => {
    const nextPeriod = period + 1;
    setPeriod(nextPeriod);

    setCandies((prev) =>
      prev.map((candy) => ({
        ...candy,
        cost: priceTable[candy.name][nextPeriod],
      }))
    );
  };



  return (
    <>
      <View style={styles.headerRow}>
        <Text style={styles.dayPeriodText}>
          Day {Math.floor(period / 8) + 1} – Period {period % 8 + 1}
        </Text>
        <Text style={styles.walletText}>💰 ${balance.toFixed(2)}</Text>
      </View>
      <FlatList
        data={candies}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View style={styles.item}>
            <Text style={styles.name}>{item.name}</Text>
            <Text>Price: ${item.cost.toFixed(2)}</Text>
            <Text>Owned: {item.quantityOwned}</Text>
            <Text>
              Avg Price: {item.averagePrice !== null ? `$${item.averagePrice.toFixed(2)}` : '—'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="BUY" onPress={() => handleBuy(index)} />
              {item.quantityOwned > 0 && (
                <Button title="SELL" onPress={() => handleSell(index)} />
              )}
            </View>
          </View>

        )}
      />
      <View style={styles.buttonContainer}>
        <Button title="Next Day" onPress={handleNextDay} />
      </View>
    </>

  );
}

const styles = StyleSheet.create({
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2a4',
  },
  dayPeriodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
  },
  list: {
    padding: 20,
  },
  item: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#eee',
    borderRadius: 10,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  buttonContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  }
});
