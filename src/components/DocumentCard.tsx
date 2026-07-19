'use client';

import Link from 'next/link';

interface Doc {
  id: string;
  filename: string;
  fileType: string;
  title: string | null;
  source: string | null;
  wordCount: number;
  createdAt: string;
  keywords: { keyword: { word: string }; score: number }[];
  snippet?: string;
  matchType?: string;
  score?: number;
}

interface DocumentCardProps {
  document: Doc;
  showSnippet?: boolean;
  showKeywords?: boolean;
}

const sourceColors: Record<string, string> = {
  claude: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
  chatgpt: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
  gemini: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
};

const fileTypeColors: Record<string, string> = {
  md: 'text-gray-400',
  pdf: 'text-red-400',
  docx: 'text-blue-400',
};

export default function DocumentCard({
  document: doc,
  showSnippet = false,
  showKeywords = true,
}: DocumentCardProps) {
  return (
    <Link
      href={`/document/${doc.id}`}
      className="doc-card block p-5 bg-gray-900 border border-gray-800 rounded-xl transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-medium text-gray-100 line-clamp-1 text-base">
          {doc.title || doc.filename}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          {doc.matchType && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 uppercase">
              {doc.matchType}
            </span>
          )}
          <span className={`text-xs ${fileTypeColors[doc.fileType] || 'text-gray-500'}`}>
            {doc.fileType.toUpperCase()}
          </span>
        </div>
      </div>

      {showSnippet && doc.snippet && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-3">{doc.snippet}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {doc.source && (
          <span className={`text-xs px-2 py-0.5 rounded border ${sourceColors[doc.source] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
            {doc.source}
          </span>
        )}
        <span className="text-xs text-gray-600">
          {doc.wordCount.toLocaleString()} words
        </span>
        <span className="text-xs text-gray-600">·</span>
        <span className="text-xs text-gray-600">
          {new Date(doc.createdAt).toLocaleDateString()}
        </span>
        {doc.score != null && (
          <>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-indigo-400">
              {(doc.score * 100).toFixed(0)}% match
            </span>
          </>
        )}
      </div>

      {showKeywords && doc.keywords && doc.keywords.length > 0 && (
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {doc.keywords.slice(0, 5).map((dk) => (
            <span
              key={dk.keyword.word}
              className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-500"
            >
              {dk.keyword.word}
            </span>
          ))}
          {doc.keywords.length > 5 && (
            <span className="text-xs text-gray-600">+{doc.keywords.length - 5} more</span>
          )}
        </div>
      )}
    </Link>
  );
}