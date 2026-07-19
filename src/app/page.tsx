'use client';

import { useState, useEffect, useCallback } from 'react';
import SearchBar from '@/components/SearchBar';
import DocumentList from '@/components/DocumentList';
import StatsPanel from '@/components/StatsPanel';
import KeywordCloud from '@/components/KeywordCloud';
import FileDropZone from '@/components/FileDropZone';
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

interface Stats {
  totalDocuments: number;
  totalKeywords: number;
  totalEdges: number;
  bySource: { source: string; count: number }[];
  byFileType: { fileType: string; count: number }[];
}

export default function DashboardPage() {
  const [searchResults, setSearchResults] = useState<Doc[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalDocuments: 0,
    totalKeywords: 0,
    totalEdges: 0,
    bySource: [],
    byFileType: [],
  });
  const [topKeywords, setTopKeywords] = useState<{ word: string; count: number }[]>([]);
  const [recentDocs, setRecentDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [importRes, keywordsRes, docsRes] = await Promise.all([
          fetch('/api/import'),
          fetch('/api/keywords'),
          fetch('/api/documents?limit=5&sort=createdAt&order=desc'),
        ]);
        const importData = await importRes.json();
        const keywordsData = await keywordsRes.json();
        const docsData = await docsRes.json();
        setStats({
          totalDocuments: importData.totalDocuments || 0,
          totalKeywords: importData.totalKeywords || 0,
          totalEdges: 0,
          bySource: importData.bySource || [],
          byFileType: importData.byFileType || [],
        });
        setTopKeywords(
          (keywordsData.keywords || []).map((k: { word: string; count: number }) => ({
            word: k.word,
            count: k.count,
          })),
        );
        setRecentDocs(docsData.documents || []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      }
    }
    load();
  }, []);

  const handleSearch = useCallback(async (query: string, semantic: boolean) => {
    if (!query) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&semantic=${semantic}&limit=20`,
      );
      const data = await res.json();
      const results = (data.results || []).map(
        (r: { document: Doc; snippet: string; matchType: string; score: number }) => ({
          ...r.document,
          snippet: r.snippet,
          matchType: r.matchType,
          score: r.score,
        }),
      );
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleFilesDropped = useCallback(async (files: File[]) => {
    setUploading(true);
    setMessage(null);
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/documents', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
          setMessage({ type: 'success', text: `Imported: ${file.name}` });
          const [importRes, keywordsRes] = await Promise.all([
            fetch('/api/import'),
            fetch('/api/keywords'),
          ]);
          const importData = await importRes.json();
          const keywordsData = await keywordsRes.json();
          setStats({
            totalDocuments: importData.totalDocuments || 0,
            totalKeywords: importData.totalKeywords || 0,
            totalEdges: 0,
            bySource: importData.bySource || [],
            byFileType: importData.byFileType || [],
          });
          setTopKeywords(
            (keywordsData.keywords || []).map((k: { word: string; count: number }) => ({
              word: k.word,
              count: k.count,
            })),
          );
        }
      } catch {
        setMessage({ type: 'error', text: `Failed: ${file.name}` });
      }
    }
    setUploading(false);
  }, []);

  const handleKeywordClick = useCallback(
    (word: string) => {
      handleSearch(word, false);
    },
    [handleSearch],
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-100">Dashboard</h2>
        <p className="text-gray-500 mt-1">Search, explore, and manage your knowledge base</p>
      </div>

      <SearchBar onSearch={handleSearch} />

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-emerald-900/30 border border-emerald-700 text-emerald-400'
              : 'bg-red-900/30 border border-red-700 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {searchResults !== null ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-200">
              {searching
                ? 'Searching...'
                : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`}
            </h3>
            <button
              onClick={() => setSearchResults(null)}
              className="text-sm text-gray-500 hover:text-gray-300"
            >
              Clear results
            </button>
          </div>
          <DocumentList
            documents={searchResults}
            showSnippet
            emptyMessage="No results found. Try different keywords."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <FileDropZone onFilesDropped={handleFilesDropped} uploading={uploading} />

            {/* Quick import LLM card */}
            <Link
              href="/import"
              className="block p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📥</span>
                <div>
                  <h3 className="font-medium text-indigo-300">
                    Import LLM Chat History
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Directly import conversations from ChatGPT, Claude, or Gemini exports
                  </p>
                </div>
                <span className="ml-auto text-indigo-400">→</span>
              </div>
            </Link>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-200">Recent Documents</h3>
                <a href="/browse" className="text-sm text-indigo-400 hover:text-indigo-300">
                  View all →
                </a>
              </div>
              <DocumentList
                documents={recentDocs}
                emptyMessage="No documents yet. Drop files above to get started."
              />
            </div>
          </div>
          <div className="space-y-6">
            <StatsPanel stats={stats} />
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Top Keywords</h3>
              <KeywordCloud keywords={topKeywords} onKeywordClick={handleKeywordClick} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}