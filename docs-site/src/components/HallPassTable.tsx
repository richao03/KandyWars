import React, { useState, useMemo } from 'react';
import hallPassData from '../data/hallPasses.json';

const RARITY_ORDER = ['common', 'magical', 'rare', 'epic', 'legendary'];
const RARITY_COLORS = {
  common: '#ffffff',
  magical: '#1eff00',
  rare: '#0070dd',
  epic: '#a335ee',
  legendary: '#ff8000',
};

type SortKey = 'rarity' | 'name';

export default function HallPassTable() {
  const [sortKey, setSortKey] = useState<SortKey>('rarity');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterRarity, setFilterRarity] = useState('all');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = [...hallPassData];
    if (filterRarity !== 'all') list = list.filter(p => p.rarity === filterRarity);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'rarity') cmp = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
      else cmp = a.name.localeCompare(b.name);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [sortKey, sortDir, filterRarity]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <select value={filterRarity} onChange={e => setFilterRarity(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #555', background: 'var(--ifm-background-surface-color)', color: 'var(--ifm-font-color-base)' }}>
          <option value="all">All Rarities</option>
          {RARITY_ORDER.map(r => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
        <span style={{ color: 'var(--ifm-color-emphasis-600)', fontSize: 14 }}>
          {filtered.length} / {hallPassData.length} passes
        </span>
      </div>

      <table style={{ width: '100%' }}>
        <thead>
          <tr>
            <th onClick={() => toggleSort('rarity')} style={{ cursor: 'pointer' }}>
              Rarity {sortKey === 'rarity' ? (sortDir === 'asc' ? '^' : 'v') : ''}
            </th>
            <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>
              Name {sortKey === 'name' ? (sortDir === 'asc' ? '^' : 'v') : ''}
            </th>
            <th>Unlock</th>
            <th>Effects</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(pass => (
            <tr key={pass.id}>
              <td>
                <span style={{
                  color: RARITY_COLORS[pass.rarity] || '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: 'capitalize',
                }}>
                  {pass.rarity}
                </span>
              </td>
              <td>
                <strong>{pass.name}</strong>
                <br />
                <span style={{ fontSize: 12, color: 'var(--ifm-color-emphasis-600)', fontStyle: 'italic' }}>
                  {pass.description}
                </span>
              </td>
              <td style={{ fontSize: 13 }}>{pass.unlockRequirement}</td>
              <td style={{ fontSize: 13 }}>
                {pass.effects.map((e, i) => (
                  <div key={i}>{e.description}</div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
