import type { UnknownWordStats, WordEnrichment } from '../types/index';

const DEFAULT_ENRICH_COUNT = 50;

/**
 * OpenAI APIを使用して未知語をenrich
 */
export async function enrichWords(
  words: UnknownWordStats[],
  apiKey: string,
  maxCount: number = DEFAULT_ENRICH_COUNT
): Promise<Record<string, WordEnrichment>> {
  // 上位N件のみ処理
  const topWords = words.slice(0, maxCount);
  
  if (topWords.length === 0) {
    return {};
  }
  
  const wordList = topWords.map(w => w.word).join(', ');
  
  const prompt = `You are an English learning assistant. For each of the following words, provide:
1. A concise Japanese translation (ja_translation)
2. A brief English definition in one sentence (meaning_en)
3. IPA phonetic notation (ipa)
4. Pronunciation tips in Japanese (pronunciation_tips_ja) - include accent, weak forms, common mistakes
5. An example sentence from context and a simple paraphrase (example)

Words: ${wordList}

Return a JSON object where keys are the words and values are objects with the above fields.
Example format:
{
  "word1": {
    "ja_translation": "翻訳",
    "meaning_en": "Definition",
    "ipa": "/wɜːrd/",
    "pronunciation_tips_ja": "注意点",
    "example": {
      "original": "Example sentence",
      "paraphrase": "Simplified version"
    }
  }
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful English learning assistant. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in API response');
    }

    // JSONを抽出（コードブロックがある場合を考慮）
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : content;
    
    const enrichment = JSON.parse(jsonText) as Record<string, WordEnrichment>;
    
    return enrichment;
  } catch (error) {
    console.error('AI enrichment error:', error);
    // エラー時は空のオブジェクトを返す
    return {};
  }
}

/**
 * APIキーをストレージから取得
 */
export async function getApiKey(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['openaiApiKey'], (result) => {
      resolve(result.openaiApiKey || null);
    });
  });
}

/**
 * APIキーをストレージに保存
 */
export async function setApiKey(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ openaiApiKey: apiKey }, () => {
      resolve();
    });
  });
}
