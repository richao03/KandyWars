import { useMemo, useState } from 'react';
import jokerData from '../data/jokers.json';

type SortKey = 'id' | 'name' | 'type' | 'maxLevel';
type SortDir = 'asc' | 'desc';

const TYPE_LABELS = { persistent: 'Aura', 'one-time': 'Instant' };
const TYPE_COLORS = { persistent: '#7851A9', 'one-time': '#ff6b35' };
const LEVEL_COLORS = { 1: '#22c55e', 2: '#3b82f6', 3: '#a855f7' };

export default function JokerTable() {
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [search, setSearch] = useState('');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let list = [...jokerData];

    if (filterType !== 'all') list = list.filter((j) => j.type === filterType);
    if (filterLevel === 'upgradeable') list = list.filter((j) => j.canLevel);
    if (filterLevel === 'fixed') list = list.filter((j) => !j.canLevel);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (j) =>
          j.name.toLowerCase().includes(s) ||
          j.description.toLowerCase().includes(s) ||
          j.flavorText.toLowerCase().includes(s)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'id') cmp = a.id - b.id;
      else if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'type') cmp = a.type.localeCompare(b.type);
      else if (sortKey === 'maxLevel') cmp = a.maxLevel - b.maxLevel;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [sortKey, sortDir, filterType, filterLevel, search]);

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      onClick={() => toggleSort(k)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
    >
      {label} {sortKey === k ? (sortDir === 'asc' ? ' ^' : ' v') : ''}
    </th>
  );

  return (
    <div>
      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="Search jokers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #555',
            background: 'var(--ifm-background-surface-color)',
            color: 'var(--ifm-font-color-base)',
            flex: '1 1 200px',
          }}
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #555',
            background: 'var(--ifm-background-surface-color)',
            color: 'var(--ifm-font-color-base)',
          }}
        >
          <option value="all">All Types</option>
          <option value="persistent">Aura Only</option>
          <option value="one-time">Instant Only</option>
        </select>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #555',
            background: 'var(--ifm-background-surface-color)',
            color: 'var(--ifm-font-color-base)',
          }}
        >
          <option value="all">All Levels</option>
          <option value="upgradeable">Upgradeable (L1-L3)</option>
          <option value="fixed">Fixed (L1 only)</option>
        </select>
        <span style={{ color: 'var(--ifm-color-emphasis-600)', fontSize: 14 }}>
          {filtered.length} / {jokerData.length} jokers
        </span>
      </div>

      {/* Table */}
      <table style={{ width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: 140, minWidth: 140 }}></th>
            <SortHeader k="id" label="ID" />
            <SortHeader k="name" label="Name" />
            <SortHeader k="type" label="Type" />
            <SortHeader k="maxLevel" label="Levels" />
            <th>In-game copy (all levels)</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((joker) => {
            const levels = joker.canLevel ? [1, 2, joker.maxLevel === 3 ? 3 : 2] : [1];
            // Dedupe in case maxLevel === 2 (L1, L2 only)
            const uniqueLevels = Array.from(new Set(levels)).slice(0, joker.maxLevel);
            return (
              <tr key={joker.id}>
                <td style={{ textAlign: 'center' }}>
                  {joker.icon ? (
                    <img
                      src={`/img/jokers/${joker.icon}`}
                      alt={joker.name}
                      style={{ width: 128, height: 128 }}
                    />
                  ) : (
                    <span style={{ width: 128, fontSize: 20 }}>?</span>
                  )}
                </td>
                <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>
                  {joker.id}
                </td>
                <td>
                  <strong>{joker.name}</strong>
                </td>
                <td>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#fff',
                      background: TYPE_COLORS[joker.type] || '#666',
                    }}
                  >
                    {joker.typeLabel || TYPE_LABELS[joker.type] || joker.type}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {joker.canLevel ? (
                    <span style={{ fontWeight: 600 }}>
                      {[1, 2, 3].slice(0, joker.maxLevel).map((lv) => (
                        <span
                          key={lv}
                          style={{ color: LEVEL_COLORS[lv], marginRight: 2 }}
                        >
                          L{lv}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span style={{ color: '#666' }}>L1</span>
                  )}
                </td>
                <td style={{ fontSize: 13, lineHeight: 1.5 }}>
                  {/* Per-level descriptions — what the player sees when holding the joker at that level. */}
                  {uniqueLevels.map((lv) => (
                    <div key={lv} style={{ marginBottom: 4 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          minWidth: 28,
                          fontWeight: 700,
                          fontSize: 11,
                          color: LEVEL_COLORS[lv as 1 | 2 | 3],
                          marginRight: 6,
                        }}
                      >
                        L{lv}:
                      </span>
                      <span>
                        {joker.perLevelDescriptions?.[String(lv) as '1' | '2' | '3'] ??
                          joker.descriptionStripped ??
                          joker.description}
                      </span>
                    </div>
                  ))}
                  {/* Ladder form — the raw description with bucket tags stripped. Shown only when it differs from L1. */}
                  {joker.descriptionStripped &&
                    joker.perLevelDescriptions?.['1'] !==
                      joker.descriptionStripped && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 11,
                          color: 'var(--ifm-color-emphasis-600)',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>Ladder: </span>
                        <span style={{ fontFamily: 'monospace' }}>
                          {joker.descriptionStripped}
                        </span>
                      </div>
                    )}
                  {/* Flavor text — the italic tagline on the card footer. */}
                  {joker.flavorText && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        fontStyle: 'italic',
                        color: 'var(--ifm-color-emphasis-700)',
                      }}
                    >
                      <span style={{ fontWeight: 600, fontStyle: 'normal' }}>
                        Flavor:{' '}
                      </span>
                      &ldquo;{joker.flavorText}&rdquo;
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
