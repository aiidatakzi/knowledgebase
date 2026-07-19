'use client';

import { useState, useEffect } from 'react';
import DocumentList from '@/components/DocumentList';

interface Doc {
  id: string;
  filename: string;
  fileType: string;
  title: string | null;
  source: string | null;
  wordCount: number;
  createdAt: string;
  keywords: { keyword: { word: string }; score: number }[];
}

export default function BrowsePage() {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [source, setSource] = useState('');
  const [fileType, setFileType] = useState('');
  const [sort, setSort] = useState('createdAt');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '20',
          sort,
          order: 'desc',
        });
        if (source) params.set('source', source);
        if (fileType) params.set('fileType', fileType);

        const res = await fetch(`/api/documents?${params}`);
        const data = await res.json();
        setDocuments(data.documents || []);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch (err) {
        console.error('Failed to load documents:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page, source, fileType, sort]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-100">Browse Documents</h2>
        <p className="text-gray-500 mt-1">{total} document{total !== 1 ? 's' : ''} indexed</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 uppercase tracking-wider">Source</label>
          <select
            value={source}
            onChange={(e) => { setSource(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All</option>
            <option value="claude">Claude</option>
            <option value="chatgpt">ChatGPT</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 uppercase tracking-wider">Type</label>
          <select
            value={fileType}
            onChange={(e) => { setFileType(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All</option>
            <option value="md">Markdown</option>
            <option value="pdf">PDF</option>
            <option value="docx">DOCX</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 uppercase tracking-wider">Sort</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="createdAt">Date Added</option>
            <option value="updatedAt">Date Updated</option>
            <option value="wordCount">Word Count</option>
            <option value="filename">Filename</option>
          </select>
        </div>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      ) : (
        <DocumentList documents={documents} emptyMessage="No documents found matching your filters." />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm disabled:opacity-30 hover:bg-gray-700 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-400 px-4">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm disabled:opacity-30 hover:bg-gray-700 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}