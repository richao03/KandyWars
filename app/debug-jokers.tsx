import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useJokers } from '../src/hooks/useJokers';
import { STANDARDIZED_JOKERS } from '../src/utils/jokerEffectEngine';
import { JOKER_ICON_MAP } from '../utils/jokerIcons';
import PixelBorder from './components/PixelBorder';

export default function DebugJokersScreen() {
  const { jokers, addJoker, removeJoker } = useJokers();
  const [query, setQuery] = useState('');

  const ownedIds = useMemo(
    () => new Set(jokers.map((j: any) => j.id.toString())),
    [jokers]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STANDARDIZED_JOKERS;
    return STANDARDIZED_JOKERS.filter(
      (j) =>
        j.name.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        String(j.id).includes(q)
    );
  }, [query]);

  const handleAdd = (joker: typeof STANDARDIZED_JOKERS[number]) => {
    addJoker({ ...joker, id: joker.id.toString(), level: 1 }, 'event');
  };

  const handleRemove = (jokerId: number) => {
    removeJoker(jokerId.toString());
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Debug: Joker Picker</Text>
      </View>

      <Text style={styles.subtitle}>
        Owned: {jokers.length} • Tap a joker to add it. Tap an owned one to remove.
      </Text>

      <TextInput
        style={styles.search}
        placeholder="Search by name, description, or id..."
        placeholderTextColor="#a78b6e"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filtered.map((joker) => {
          const owned = ownedIds.has(joker.id.toString());
          const icon = JOKER_ICON_MAP[joker.name];
          return (
            <Pressable
              key={joker.id}
              onPress={() => (owned ? handleRemove(joker.id) : handleAdd(joker))}
              style={({ pressed }) => [
                { opacity: pressed ? 0.7 : 1 },
                styles.itemWrap,
              ]}
            >
              <PixelBorder
                borderColor={owned ? '#22c55e' : '#d4a574'}
                borderWidth={3}
                backgroundColor={
                  owned ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.85)'
                }
                innerPadding={10}
              >
                <View style={styles.itemRow}>
                  {icon ? (
                    <Image source={icon} style={styles.icon} />
                  ) : (
                    <View style={styles.iconFallback}>
                      <Text style={styles.iconFallbackText}>?</Text>
                    </View>
                  )}
                  <View style={styles.itemBody}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemName}>
                        #{joker.id} {joker.name}
                      </Text>
                      <Text
                        style={[
                          styles.statusTag,
                          owned ? styles.statusOwned : styles.statusAvailable,
                        ]}
                      >
                        {owned ? 'OWNED — tap to remove' : 'tap to add'}
                      </Text>
                    </View>
                    <Text style={styles.itemDesc} numberOfLines={2}>
                      {joker.description}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {joker.type} • max lv {joker.maxLevel}
                    </Text>
                  </View>
                </View>
              </PixelBorder>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 12,
    backgroundColor: '#fdf6e3',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#d4a574',
    borderRadius: 8,
  },
  backText: {
    color: '#fff',
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5d4e37',
    fontFamily: 'PixeloidMono',
  },
  subtitle: {
    fontSize: 12,
    color: '#8b5a3c',
    fontFamily: 'PixeloidMono',
    marginBottom: 8,
  },
  search: {
    borderWidth: 2,
    borderColor: '#d4a574',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: 'PixeloidMono',
    fontSize: 14,
    color: '#5d4e37',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 30,
    gap: 6,
  },
  itemWrap: {
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  iconFallback: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#e6d3b3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFallbackText: {
    fontFamily: 'PixeloidMono',
    fontWeight: '700',
    color: '#8b5a3c',
  },
  itemBody: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5d4e37',
    fontFamily: 'PixeloidMono',
    flex: 1,
  },
  statusTag: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'PixeloidMono',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusOwned: {
    backgroundColor: '#22c55e',
    color: '#fff',
  },
  statusAvailable: {
    backgroundColor: '#fde047',
    color: '#5d4e37',
  },
  itemDesc: {
    fontSize: 11,
    color: '#5d4e37',
    fontFamily: 'PixeloidMono',
    lineHeight: 14,
  },
  itemMeta: {
    fontSize: 9,
    color: '#a78b6e',
    fontFamily: 'PixeloidMono',
    marginTop: 2,
  },
});
