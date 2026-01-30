import { useState, useEffect } from 'react';
import { useKnownWords } from '../hooks/useKnownWords';
import { getApiKey, setApiKey } from '../../utils/ai-enricher';

export function Settings() {
  const { knownWords, addWord, removeWord, importWords, exportWords } = useKnownWords();
  const [apiKey, setApiKeyState] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');

  // Load API key
  useEffect(() => {
    getApiKey().then((key) => {
      if (key) {
        setApiKeyState(key);
      }
    });
  }, []);

  const handleSaveApiKey = async () => {
    await setApiKey(apiKey);
    alert('APIキーを保存しました');
  };

  const handleAddWord = () => {
    if (newWord.trim()) {
      addWord(newWord.trim());
      setNewWord('');
    }
  };

  const handleExport = () => {
    const words = exportWords();
    const text = words.join('\n');
    navigator.clipboard.writeText(text);
    alert('既知単語リストをクリップボードにコピーしました');
  };

  const handleImport = () => {
    const words = importText
      .split('\n')
      .map((w) => w.trim())
      .filter(Boolean);
    importWords(words);
    setImportText('');
    setShowImport(false);
    alert(`${words.length}個の単語をインポートしました`);
  };

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>設定</h2>

      {/* APIキー設定 */}
      <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>OpenAI APIキー</h3>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
          AI enrich機能を使用するにはAPIキーが必要です
        </p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKeyState(e.target.value)}
            placeholder="sk-..."
            style={{
              flex: 1,
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          />
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              backgroundColor: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {showApiKey ? '隠す' : '表示'}
          </button>
          <button
            onClick={handleSaveApiKey}
            style={{
              padding: '6px 12px',
              border: '1px solid #007bff',
              backgroundColor: '#007bff',
              color: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            保存
          </button>
        </div>
      </div>

      {/* 既知単語管理 */}
      <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>既知単語管理</h3>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
          既知単語数: {knownWords.size}
        </p>

        {/* 単語追加 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddWord();
              }
            }}
            placeholder="単語を入力"
            style={{
              flex: 1,
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          />
          <button
            onClick={handleAddWord}
            style={{
              padding: '6px 12px',
              border: '1px solid #007bff',
              backgroundColor: '#007bff',
              color: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            追加
          </button>
        </div>

        {/* 既知単語リスト */}
        <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
          {Array.from(knownWords).map((word) => (
            <div
              key={word}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                borderBottom: '1px solid #eee',
              }}
            >
              <span style={{ fontSize: '13px' }}>{word}</span>
              <button
                onClick={() => removeWord(word)}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #dc3545',
                  backgroundColor: '#fff',
                  color: '#dc3545',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                削除
              </button>
            </div>
          ))}
        </div>

        {/* エクスポート/インポート */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleExport}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              backgroundColor: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            エクスポート
          </button>
          <button
            onClick={() => setShowImport(!showImport)}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              backgroundColor: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            インポート
          </button>
        </div>

        {showImport && (
          <div style={{ marginTop: '12px' }}>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="1行に1単語ずつ入力"
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={handleImport}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #007bff',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                インポート実行
              </button>
              <button
                onClick={() => {
                  setShowImport(false);
                  setImportText('');
                }}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  backgroundColor: '#fff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
