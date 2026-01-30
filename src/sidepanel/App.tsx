import { useState, useEffect } from 'react';
import { CurrentSubtitle } from './components/CurrentSubtitle';
import { UnknownRanking } from './components/UnknownRanking';
import { WordDetail } from './components/WordDetail';
import { Settings } from './components/Settings';
import { useVideoData } from './hooks/useVideoData';
import { recordToWordIndex } from '../utils/word-indexer';
import type { WordEnrichment, Message } from '../types/index';

type ViewMode = 'main' | 'settings';

function App() {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const { videoData, loading } = useVideoData(videoId);

  // Get video ID from current tab
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'getCurrentVideoId' }, (response: Message) => {
      if (response.type === 'currentVideoId') {
        setVideoId(response.data as string | null);
      }
    });

    // Periodically check video ID (to handle video changes)
    const interval = setInterval(() => {
      chrome.runtime.sendMessage({ type: 'getCurrentVideoId' }, (response: Message) => {
        if (response.type === 'currentVideoId') {
          setVideoId(response.data as string | null);
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Reset selection when video changes
  useEffect(() => {
    setSelectedWord(null);
  }, [videoId]);

  const handleWordClick = (word: string) => {
    setSelectedWord(word);
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!videoData) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>YouTube動画を開いて字幕を表示してください。</p>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          字幕データが蓄積されるまで少しお待ちください。
        </p>
      </div>
    );
  }

  const wordIndex = recordToWordIndex(videoData.wordIndex);
  const selectedOccurrences = selectedWord ? wordIndex.get(selectedWord) || [] : [];
  const selectedEnrichment: WordEnrichment | null = selectedWord
    ? videoData.enrichment[selectedWord] || null
    : null;

  if (viewMode === 'settings') {
    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '16px' }}>設定</h1>
          <button
            onClick={() => setViewMode('main')}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              backgroundColor: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            戻る
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Settings />
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setViewMode('settings')}
          style={{
            padding: '6px 12px',
            border: '1px solid #ddd',
            backgroundColor: '#fff',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          設定
        </button>
      </div>
      <CurrentSubtitle />
      
      {selectedWord ? (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <button
            onClick={() => setSelectedWord(null)}
            style={{
              padding: '8px 16px',
              margin: '16px',
              border: '1px solid #ddd',
              backgroundColor: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ← ランキングに戻る
          </button>
          <WordDetail
            word={selectedWord}
            enrichment={selectedEnrichment}
            occurrences={selectedOccurrences}
          />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <UnknownRanking
            unknownStats={videoData.unknownStats}
            onWordClick={handleWordClick}
          />
        </div>
      )}
    </div>
  );
}

export default App;
