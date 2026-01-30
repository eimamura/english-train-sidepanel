# English Train Side Panel

A Chrome/Brave browser extension that automatically extracts unknown words from YouTube English subtitles and provides AI-powered enrichment with meanings, pronunciations, and learning tips.

## Features

- **Automatic Subtitle Extraction**: Monitors YouTube captions in real-time using MutationObserver
- **Unknown Word Detection**: Identifies words not in your known words list
- **Word Ranking**: Displays unknown words sorted by frequency
- **AI Enrichment**: Generates Japanese translations, IPA notation, pronunciation tips, and example sentences using OpenAI API
- **Timeline Tracking**: Shows all occurrences of each word with clickable timestamps
- **Known Words Management**: Add/remove words from your known list, import/export word lists
- **Side Panel UI**: Clean, modern interface that stays open while browsing

## Architecture

```
YouTube Page (Content Script)
    ↓ Caption extraction & monitoring
Background Service Worker
    ↓ Data processing & AI calls
Side Panel (React UI)
    ↓ User interactions
Chrome Storage (knownWords, videoCache)
```

## Installation

### Prerequisites

- Node.js 18+
- pnpm (install with `npm install -g pnpm` or `corepack enable`)
- Brave browser (or Chrome)

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd english-train-sidepanel
```

2. Install dependencies:
```bash
pnpm install
```

3. Build the extension:
```bash
pnpm build
```

4. Load the extension in Brave:
   - Open `brave://extensions/`
   - Enable "Developer mode" (右上のトグル)
   - Click "Load unpacked" (パッケージ化されていない拡張機能を読み込む)
   - Select the `dist` folder from this project

## Usage

### Basic Workflow

1. **Open a YouTube video** with English subtitles enabled
2. **Open the side panel** by clicking the extension icon
3. **Watch the video** - subtitles are automatically captured
4. **View unknown words** in the ranking panel
5. **Click a word** to see detailed information:
   - Japanese translation
   - English definition
   - IPA phonetic notation
   - Pronunciation tips
   - Example sentences
   - Timeline of all occurrences
6. **Click a timestamp** to jump to that moment in the video

### Setting Up AI Enrichment

1. Open the side panel and click "設定" (Settings)
2. Enter your OpenAI API key
3. Click "保存" (Save)
4. The extension will automatically enrich unknown words (top 50 by default)

### Managing Known Words

1. Go to Settings (設定)
2. Add words manually or import a list
3. Words can be exported for backup
4. Known words are excluded from the unknown ranking

## Project Structure

```
english-train-sidepanel/
├── manifest.json              # Manifest V3 configuration
├── package.json               # Dependencies
├── vite.config.ts             # Vite build config
├── tsconfig.json              # TypeScript config
├── src/
│   ├── background/
│   │   └── service-worker.ts  # Background processing
│   ├── content/
│   │   └── youtube-caption.ts # Caption extraction
│   ├── sidepanel/
│   │   ├── index.html         # Side panel HTML
│   │   ├── main.tsx           # React entry point
│   │   ├── App.tsx            # Main component
│   │   ├── components/        # UI components
│   │   └── hooks/             # React hooks
│   ├── utils/
│   │   ├── tokenizer.ts       # Word tokenization
│   │   ├── word-indexer.ts    # Word indexing
│   │   ├── unknown-detector.ts # Unknown word detection
│   │   └── ai-enricher.ts     # AI enrichment
│   └── types/
│       └── index.ts            # TypeScript types
└── .gitignore
```

## Development

### Development Mode

```bash
pnpm dev
```

This starts Vite in watch mode. After making changes:
1. Reload the extension in `brave://extensions/`
2. Refresh the YouTube page

### Building for Production

```bash
pnpm build
```

Output will be in the `dist` folder.

## How It Works

### Caption Extraction

- Uses MutationObserver to watch for `.ytp-caption-segment` elements
- Captures subtitle text and timestamps
- Sends segments to background worker for processing

### Word Processing Pipeline

1. **Tokenization**: Splits text into words, normalizes (lowercase, removes punctuation)
2. **Indexing**: Creates a word index with occurrence positions and context
3. **Unknown Detection**: Compares words against known words set
4. **Ranking**: Sorts unknown words by frequency

### AI Enrichment

- Processes top N unknown words (default: 50) in a single batch
- Uses OpenAI GPT-4o-mini for cost efficiency
- Caches results to avoid redundant API calls
- Returns structured data: translation, IPA, pronunciation tips, examples

### Data Storage

- **Known Words**: Stored in `chrome.storage.local` as an array
- **Video Cache**: Stored per video ID with segments, word index, stats, and enrichment
- **API Key**: Encrypted storage in `chrome.storage.local`

## Configuration

### Environment Variables

None required. API key is stored in browser storage via the Settings UI.

### Customization

- **Enrichment Count**: Modify `DEFAULT_ENRICH_COUNT` in `src/utils/ai-enricher.ts`
- **Stop Words**: Edit `STOP_WORDS` in `src/utils/tokenizer.ts`
- **Processing Interval**: Adjust buffer processing logic in `src/background/service-worker.ts`

## Limitations

- Requires YouTube subtitles to be enabled
- Works best with English subtitles
- AI enrichment requires OpenAI API key (paid service)
- YouTube DOM structure changes may break caption extraction

## Troubleshooting

### Subtitles Not Appearing

1. Ensure subtitles are enabled on YouTube
2. Check browser console for errors
3. Reload the extension and YouTube page

### AI Enrichment Not Working

1. Verify API key is set in Settings
2. Check API key validity
3. Review browser console for API errors
4. Ensure you have OpenAI API credits

### Words Not Detected

1. Check if words are in your known words list
2. Verify stop words aren't filtering them out
3. Ensure subtitles are being captured (check console)

## Future Enhancements

- [ ] Phrase detection (multi-word expressions)
- [ ] Learning progress tracking
- [ ] Spaced repetition system
- [ ] Multiple language support
- [ ] Custom AI model selection
- [ ] A-B repeat functionality
- [ ] Manual subtitle paste mode

## License

[Your License Here]

## Contributing

[Contributing Guidelines Here]

## Support

[Support Information Here]
