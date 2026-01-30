import { useCurrentSubtitle } from '../hooks/useCurrentSubtitle';
import { useKnownWords } from '../hooks/useKnownWords';
import { tokenize } from '../../utils/tokenizer';

export function CurrentSubtitle() {
  const subtitle = useCurrentSubtitle();
  const { isKnown } = useKnownWords();

  if (!subtitle || !subtitle.text) {
    return (
      <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
        <p style={{ color: '#666', margin: 0 }}>字幕を待機中...</p>
      </div>
    );
  }

  // Split into words and highlight unknown words
  const words = subtitle.text.split(/(\s+)/);
  const tokens = tokenize(subtitle.text);

  return (
    <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0', backgroundColor: '#f9f9f9' }}>
      <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
        {words.map((word, index) => {
          const normalized = word.toLowerCase().replace(/[^\w]/g, '');
          const isUnknown = normalized && !isKnown(normalized) && tokens.includes(normalized);
          
          return (
            <span
              key={index}
              style={{
                backgroundColor: isUnknown ? '#fff3cd' : 'transparent',
                padding: isUnknown ? '2px 4px' : '0',
                borderRadius: '2px',
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
      <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
        {formatTime(subtitle.timeMs)}
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
