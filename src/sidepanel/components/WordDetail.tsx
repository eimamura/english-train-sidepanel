import type { WordEnrichment } from '../../types/index';
import { TimelineList } from './TimelineList';
import { useKnownWords } from '../hooks/useKnownWords';

interface WordDetailProps {
  word: string;
  enrichment: WordEnrichment | null;
  occurrences: Array<{ startMs: number; endMs: number; segmentId: number; context: string }>;
}

export function WordDetail({ word, enrichment, occurrences }: WordDetailProps) {
  const { isKnown, addWord, removeWord } = useKnownWords();
  const known = isKnown(word);

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>{word}</h2>
        <button
          onClick={() => {
            if (known) {
              removeWord(word);
            } else {
              addWord(word);
            }
          }}
          style={{
            padding: '6px 12px',
            border: '1px solid #ddd',
            backgroundColor: known ? '#28a745' : '#fff',
            color: known ? '#fff' : '#333',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          {known ? '既知語' : '既知語に追加'}
        </button>
      </div>

      {enrichment ? (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ marginBottom: '12px' }}>
            <strong style={{ color: '#666', fontSize: '12px' }}>日本語訳:</strong>
            <div style={{ fontSize: '14px', marginTop: '4px' }}>{enrichment.ja_translation}</div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <strong style={{ color: '#666', fontSize: '12px' }}>意味:</strong>
            <div style={{ fontSize: '14px', marginTop: '4px' }}>{enrichment.meaning_en}</div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <strong style={{ color: '#666', fontSize: '12px' }}>発音記号 (IPA):</strong>
            <div style={{ fontSize: '16px', fontFamily: 'monospace', marginTop: '4px' }}>
              {enrichment.ipa}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <strong style={{ color: '#666', fontSize: '12px' }}>発音の注意点:</strong>
            <div style={{ fontSize: '14px', marginTop: '4px' }}>{enrichment.pronunciation_tips_ja}</div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <strong style={{ color: '#666', fontSize: '12px' }}>例文:</strong>
            <div style={{ fontSize: '14px', marginTop: '4px', fontStyle: 'italic' }}>
              {enrichment.example.original}
            </div>
            <div style={{ fontSize: '13px', marginTop: '4px', color: '#666' }}>
              {enrichment.example.paraphrase}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '16px', backgroundColor: '#f0f0f0', borderRadius: '4px', marginBottom: '16px' }}>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            AI enrich情報を読み込み中...（APIキーが設定されていない場合は表示されません）
          </p>
        </div>
      )}

      <TimelineList word={word} occurrences={occurrences} />
    </div>
  );
}
