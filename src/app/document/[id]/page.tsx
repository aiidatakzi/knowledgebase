'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DocumentList from '@/components/DocumentList';

interface Doc {
  id: string;
  filename: string;
  filePath: string;
  fileType: string;
  title: string | null;
  content: string;
  source: string | null;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  keywords: { keyword: { id: string; word: string; stem: string }; score: number; count: number }[];
}

const sourceColors: Record<string, string> = {
  claude: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
  chatgpt: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
  gemini: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
};

export default function DocumentPage() {
  const params = useParams();
  const id = params.id as string;
  const [document, setDocument] = useState<Doc | null>(null);
  const [related, setRelated] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/documents/${id}`);
        const data = await res.json();
        if (data.document) {
          setDocument(data.document);
          setRelated(data.related || []);
        }
      } catch (err) {
        console.error('Failed to load document:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Delete this document? This action cannot be undone.')) return;
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      setDeleted(true);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-16 text-gray-500">Loading document...</div>
      </div>
    );
  }

  if (deleted) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🗑️</div>
          <p className="text-gray-300">Document deleted.</p>
          <Link href="/browse" className="text-indigo-400 hover:text-indigo-300 mt-2 inline-block">
            ← Back to browse
          </Link>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-16 text-gray-500">Document not found.</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/browse"
            className="text-sm text-gray-500 hover:text-gray-300 mb-2 inline-block"
          >
            ← Browse
          </Link>
          <h2 className="text-2xl font-bold text-gray-100">{document.title || document.filename}</h2>
          <div className="flex items-center gap-3 mt-2">
            {document.source && (
              <span
                className={`text-xs px-2 py-0.5 rounded border ${
                  sourceColors[document.source] || 'bg-gray-800 text-gray-400 border-gray-700'
                }`}
              >
                {document.source}
              </span>
            )}
            <span className="text-xs text-gray-500 uppercase">{document.fileType}</span>
            <span className="text-xs text-gray-600">
              {document.wordCount.toLocaleString()} words
            </span>
            <span className="text-xs text-gray-600">
              Indexed {new Date(document.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="px-3 py-2 bg-red-900/30 border border-red-800 text-red-400 rounded-lg text-sm hover:bg-red-900/50 transition-colors"
        >
          Delete
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Content */}
        <div className="lg:col-span-2">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-300 leading-relaxed">
              {document.content}
            </pre>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Keywords */}
          {document.keywords && document.keywords.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">
                Keywords ({document.keywords.length})
              </h3>
              <div className="space-y-2">
                {document.keywords.map((dk) => (
                  <div
                    key={dk.keyword.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-300">{dk.keyword.word}</span>
                    <span className="text-xs text-gray-600">
                      {(dk.score * 100).toFixed(0)}% · {dk.count}×
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related documents */}
          {related.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Related Documents</h3>
              <DocumentList documents={related} emptyMessage="No related documents." />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}