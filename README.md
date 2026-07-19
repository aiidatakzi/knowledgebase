# Knowledge Base — Personal Knowledge Warehouse

Parse, index, and explore your LLM conversation archives (Claude, ChatGPT, Gemini). Built with Next.js 14, SQLite, and vis-network.

## Features

- **File Parsing** — Supports Markdown (with frontmatter), PDF, and DOCX files
- **Auto-Detection** — Automatically identifies source (Claude/ChatGPT/Gemini) from content and filenames
- **Keyword Extraction** — NLP-powered TF-IDF keyword extraction with stemming and stopword removal
- **Full-Text Search** — Multi-word search across all document content
- **Knowledge Graph** — Interactive force-directed graph showing keyword co-occurrence relationships
- **Semantic Search** — Optional local embedding-based search (via @xenova/transformers)
- **File Watching** — Auto-imports new/modified files in the watch directory
- **Drag & Drop** — Manual file import via drag-and-drop or file picker
- **Auto-Tagging** — Documents are automatically tagged with extracted keywords

## Getting Started

```bash
# Install dependencies
npm install

# Initialize the database
npx prisma db push
npx prisma generate

# Create the data directory
mkdir -p data

# Start development server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Usage

### Adding Documents

1. **Auto-import**: Drop files into the `data/` directory. They'll be auto-indexed if file watching is enabled.
2. **Manual import**: Use the drag-and-drop zone on the Dashboard to upload files.
3. **API import**: `POST /api/documents` with a file or path.

### Scanning an Existing Directory

```bash
curl -X POST http://localhost:3000/api/import \
  -H "Content-Type: application/json" \
  -d '{"action":"scan","directory":"./data"}'
```

### Searching

- **Dashboard**: Use the search bar for full-text search. Toggle "Semantic" for AI-powered search.
- **Browse**: Filter by source, file type, and sort by date/name/size.
- **Graph**: Click keyword nodes to find related documents.

### Markdown Frontmatter

For best results, add frontmatter to your markdown files:

```yaml
---
title: "My Document Title"
source: claude  # or chatgpt, gemini
date: 2026-07-15
---
```

## Project Structure

```
src/
├── app/           # Next.js App Router pages & API routes
│   ├── api/       # REST API endpoints
│   ├── browse/    # Document browser
│   ├── document/  # Single document view
│   └── graph/     # Knowledge graph view
├── components/    # React components
├── lib/           # Core logic
│   ├── db.ts      # Database client
│   ├── parser.ts  # File parser (MD/PDF/DOCX)
│   ├── indexer.ts # Keyword extraction & indexing
│   ├── search.ts  # Full-text & semantic search
│   ├── graph.ts   # Graph data builder
│   ├── embeddings.ts # Local embedding generation
│   └── watcher.ts # File system watcher
└── types/         # TypeScript types
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/documents` | List documents (paginated, filterable) |
| POST | `/api/documents` | Import a file (multipart upload or path) |
| GET | `/api/documents/[id]` | Get document with related docs |
| DELETE | `/api/documents/[id]` | Delete document |
| GET | `/api/search?q=...` | Full-text + semantic search |
| GET | `/api/graph` | Graph data (nodes + edges) |
| GET | `/api/keywords` | Top keywords |
| GET | `/api/import` | Stats (documents, keywords, sources) |
| POST | `/api/import` | Scan directory or start/stop watcher |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite via Prisma 7 + libSQL adapter
- **NLP**: natural (tokenization, stemming, TF-IDF)
- **Visualization**: vis-network (force-directed graph)
- **File Watching**: chokidar
- **Parsing**: gray-matter (MD), pdf-parse (PDF), mammoth (DOCX)
- **Embeddings**: @xenova/transformers (optional, local ML)

## Optional: Semantic Search

Semantic search uses local ML models via `@xenova/transformers`. To enable:

```bash
npm install @xenova/transformers
```

Then toggle "Semantic" when searching. The first query will download the model (~80MB).