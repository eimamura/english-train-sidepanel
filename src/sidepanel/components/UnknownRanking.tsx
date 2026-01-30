import { useState } from 'react';
import type { UnknownWordStats } from '../../types/index';

interface UnknownRankingProps {
  unknownStats: UnknownWordStats[];
  onWordClick: (word: string) => void;
}

type TabType = 'unknown' | 'all' | 'first';

export function UnknownRanking({ unknownStats, onWordClick }: UnknownRankingProps) {
  const [activeTab, setActiveTab] = useState<TabType>('unknown');

  return (
    <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('unknown')}
          style={{
            padding: '6px 12px',
            border: '1px solid #ddd',
            backgroundColor: activeTab === 'unknown' ? '#007bff' : '#fff',
            color: activeTab === 'unknown' ? '#fff' : '#333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          未知ランキング
        </button>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '6px 12px',
            border: '1px solid #ddd',
            backgroundColor: activeTab === 'all' ? '#007bff' : '#fff',
            color: activeTab === 'all' ? '#fff' : '#333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          全体ランキング
        </button>
        <button
          onClick={() => setActiveTab('first')}
          style={{
            padding: '6px 12px',
            border: '1px solid #ddd',
            backgroundColor: activeTab === 'first' ? '#007bff' : '#fff',
            color: activeTab === 'first' ? '#fff' : '#333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          初出単語
        </button>
      </div>

      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {getFilteredStats(unknownStats, activeTab).map((stat) => (
          <div
            key={stat.word}
            onClick={() => onWordClick(stat.word)}
            style={{
              padding: '8px',
              borderBottom: '1px solid #eee',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div>
              <strong style={{ fontSize: '14px' }}>{stat.word}</strong>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                {stat.sampleContext.substring(0, 50)}...
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{stat.count}回</div>
              <div style={{ fontSize: '11px', color: '#999' }}>
                {formatTime(stat.firstOccurrence)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getFilteredStats(stats: UnknownWordStats[], tab: TabType): UnknownWordStats[] {
  if (tab === 'unknown') {
    return stats;
  } else if (tab === 'all') {
    return stats; // All ranking is the same (showing only unknown words)
  } else {
    // First occurrence words: sorted by first occurrence time
    return [...stats].sort((a, b) => a.firstOccurrence - b.firstOccurrence);
  }
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
