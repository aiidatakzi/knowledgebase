'use client';

import { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string, semantic: boolean) => void;
  placeholder?: string;
  initialQuery?: string;
}

export default function SearchBar({
  onSearch,
  placeholder = 'Search your knowledge base...',
  initialQuery = '',
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [semantic, setSemantic] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), semantic);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="flex-1 relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); onSearch('', false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            ✕
          </button>
        )}
      </div>
      <button
        type="submit"
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
      >
        Search
      </button>
      <label className="flex items-center gap-2 px-3 py-3 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 transition-colors text-sm text-gray-400">
        <input
          type="checkbox"
          checked={semantic}
          onChange={(e) => setSemantic(e.target.checked)}
          className="accent-indigo-500"
        />
        Semantic
      </label>
    </form>
  );
}