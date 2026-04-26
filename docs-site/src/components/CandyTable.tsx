import React, { useState, useMemo } from 'react';
import candyData from '../data/candy.json';

const SIZE_COLORS = { small: '#22c55e', medium: '#3b82f6', big: '#a855f7' };
const TYPE_COLORS = {
  gummy: '#ff6b9d', chocolate: '#8b4513', hard_candy: '#ff6b35',
  sour: '#fbbf24', chewy: '#ec4899', fruity: '#22d3ee',
};

export default function CandyTable() {
  const [filterSize, setFilterSize] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const filtered = useMemo(() => {
    let list = [...candyData];
    if (filterSize !== 'all') list = list.filter(c => c.size === filterSize);
    if (filterType !== 'all') list = list.filter(c => c.types.includes(filterType));
    return list;
  }, [filterSize, filterType]);

  const allTypes = [...new Set(candyData.flatMap(c => c.types))].sort();

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <select value={filterSize} onChange={e => setFilterSize(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #555', background: 'var(--ifm-background-surface-color)', color: 'var(--ifm-font-color-base)' }}>
          <option value="all">All Sizes</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="big">Big</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #555', background: 'var(--ifm-background-surface-color)', color: 'var(--ifm-font-color-base)' }}>
          <option value="all">All Types</option>
          {allTypes.map(t => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>
        <span style={{ color: 'var(--ifm-color-emphasis-600)', fontSize: 14 }}>
          {filtered.length} / {candyData.length}
        </span>
      </div>

      <table style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Size</th>
            <th>Types</th>
            <th>Price Range</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(candy => (
            <tr key={candy.name}>
              <td><strong>{candy.name}</strong></td>
              <td>
                <span style={{
                  color: SIZE_COLORS[candy.size] || '#fff',
                  fontWeight: 700,
                  textTransform: 'capitalize',
                }}>
                  {candy.size}
                </span>
              </td>
              <td>
                {candy.types.map(t => (
                  <span key={t} style={{
                    padding: '1px 6px', borderRadius: 3, fontSize: 12,
                    fontWeight: 600, color: '#fff', marginRight: 4,
                    background: TYPE_COLORS[t] || '#666',
                  }}>
                    {t.replace('_', ' ')}
                  </span>
                ))}
              </td>
              <td style={{ fontFamily: 'monospace' }}>
                ${candy.baseMin} — ${candy.baseMax}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
