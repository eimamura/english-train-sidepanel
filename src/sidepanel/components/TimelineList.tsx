import type { WordOccurrence } from '../../types/index';
import type { Message } from '../../types/index';

interface TimelineListProps {
  word: string;
  occurrences: WordOccurrence[];
}

export function TimelineList({ word: _word, occurrences }: TimelineListProps) {
  const handleSeek = (timeMs: number) => {
    // Content Scriptにシーク命令を送信
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'seekTo',
          timeMs,
        } as Message);
      }
    });
  };

  return (
    <div>
      <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>出現箇所 ({occurrences.length}回)</h3>
      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {occurrences.map((occurrence, index) => (
          <div
            key={index}
            onClick={() => handleSeek(occurrence.startMs)}
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
            <div style={{ fontSize: '13px', color: '#666' }}>
              {occurrence.context.substring(0, 60)}...
            </div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#007bff',
                marginLeft: '12px',
              }}
            >
              {formatTime(occurrence.startMs)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
