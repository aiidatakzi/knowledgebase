'use client';

import DocumentCard from './DocumentCard';

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

interface DocumentListProps {
  documents: Doc[];
  showSnippet?: boolean;
  emptyMessage?: string;
}

export default function DocumentList({
  documents,
  showSnippet = false,
  emptyMessage = 'No documents found.',
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="text-4xl mb-3">📄</div>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          showSnippet={showSnippet}
        />
      ))}
    </div>
  );
}