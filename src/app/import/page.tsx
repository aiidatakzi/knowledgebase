'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';

interface ImportResult {
  success: boolean;
  format?: string;
  total: number;
  imported: number;
  errors: number;
  importedList?: { id: string; title: string }[];
  errorList?: { title: string; error: string }[];
  error?: string;
}

const platformInfo = {
  chatgpt: {
    name: 'ChatGPT',
    color: 'text-emerald-400',
    bg: 'bg-emerald-600/20',
    border: 'border-emerald-500/30',
    instructions: 'Settings → Data controls → Export data',
    icon: '🤖',
  },
  claude: {
    name: 'Claude',
    color: 'text-amber-400',
    bg: 'bg-amber-600/20',
    border: 'border-amber-500/30',
    instructions: 'Settings → Account → Export data',
    icon: '🧠',
  },
  gemini: {
    name: 'Gemini',
    color: 'text-blue-400',
    bg: 'bg-blue-600/20',
    border: 'border-blue-500/30',
    instructions: 'Google Takeout → Select Gemini → Export',
    icon: '💎',
  },
};

export default function ImportPage() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<{
    format: string;
    count: number;
    titles: string[];
  } | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setResult(null);
    setPreview(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/import/llm', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok && data.success) {
        setResult(data);
      } else {
        setResult({ success: false, error: data.error || 'Import failed', total: 0, imported: 0, errors: 1 });
      }
    } catch (err) {
      setResult({
        success: false,
        error: String(err),
        total: 0,
        imported: 0,
        errors: 1,
      });
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'application/zip': ['.zip'],
    },
    multiple: false,
    maxFiles: 1,
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-100">Import LLM Chat History</h2>
        <p className="text-gray-500 mt-1">
          Import your conversation history directly from ChatGPT, Claude, or Gemini exports
        </p>
      </div>

      {/* Platform instructions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(platformInfo).map(([key, info]) => (
          <div
            key={key}
            className={`p-4 rounded-xl border ${info.bg} ${info.border}`}
          >
            <div className="text-2xl mb-2">{info.icon}</div>
            <h3 className={`font-medium ${info.color}`}>{info.name}</h3>
            <p className="text-xs text-gray-400 mt-1">{info.instructions}</p>
            <p className="text-xs text-gray-500 mt-2">
              Upload <code className="text-gray-400">conversations.json</code> or a ZIP export
            </p>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-gray-700 hover:border-gray-500 bg-gray-900'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div>
            <div className="text-3xl mb-3 animate-bounce">⏳</div>
            <p className="text-gray-300 font-medium">Importing conversations...</p>
            <p className="text-gray-500 text-sm mt-1">This may take a moment for large exports</p>
          </div>
        ) : isDragActive ? (
          <div>
            <div className="text-3xl mb-3">📥</div>
            <p className="text-indigo-300 font-medium">Drop your export file here</p>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-3">📂</div>
            <p className="text-gray-300 font-medium">
              Drop your LLM export file here
            </p>
            <p className="text-gray-500 text-sm mt-1">
              or click to browse — supports .json and .zip
            </p>
          </div>
        )}
      </div>

      {/* Preview (before import) */}
      {preview && !result && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="font-medium text-gray-200 mb-3">Preview</h3>
          <div className="flex gap-4 mb-4">
            <div className="text-sm">
              <span className="text-gray-500">Platform: </span>
              <span className="text-gray-200 font-medium">
                {platformInfo[preview.format as keyof typeof platformInfo]?.name || preview.format}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Conversations: </span>
              <span className="text-gray-200 font-medium">{preview.count}</span>
            </div>
          </div>
          {preview.titles.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">First {Math.min(preview.titles.length, 10)} conversations:</p>
              <ul className="space-y-1">
                {preview.titles.map((t, i) => (
                  <li key={i} className="text-sm text-gray-400">• {t}</li>
                ))}
              </ul>
              {preview.count > 10 && (
                <p className="text-xs text-gray-600 mt-1">...and {preview.count - 10} more</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div
          className={`rounded-xl p-5 border ${
            result.success
              ? 'bg-emerald-900/20 border-emerald-700'
              : 'bg-red-900/20 border-red-700'
          }`}
        >
          {result.success ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <div>
                  <h3 className="font-medium text-emerald-300">Import Complete</h3>
                  <p className="text-sm text-emerald-400/70">
                    {platformInfo[result.format as keyof typeof platformInfo]?.name || result.format} export
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                  <div className="text-xl font-bold text-gray-100">{result.total}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                  <div className="text-xl font-bold text-emerald-400">{result.imported}</div>
                  <div className="text-xs text-gray-500">Imported</div>
                </div>
                <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                  <div className="text-xl font-bold text-red-400">{result.errors}</div>
                  <div className="text-xs text-gray-500">Errors</div>
                </div>
              </div>

              {result.importedList && result.importedList.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Imported conversations:</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {result.importedList.map((item) => (
                      <Link
                        key={item.id}
                        href={`/document/${item.id}`}
                        className="block text-sm text-indigo-400 hover:text-indigo-300 truncate"
                      >
                        • {item.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {result.errorList && result.errorList.length > 0 && (
                <div>
                  <p className="text-sm text-red-400 mb-2">Errors:</p>
                  {result.errorList.map((e, i) => (
                    <p key={i} className="text-xs text-red-300">
                      {e.title}: {e.error}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Link
                  href="/browse"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors"
                >
                  Browse All Documents →
                </Link>
                <Link
                  href="/graph"
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors"
                >
                  View Graph →
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">❌</span>
                <h3 className="font-medium text-red-300">Import Failed</h3>
              </div>
              <p className="text-sm text-red-400/80">{result.error}</p>
              <p className="text-xs text-gray-500 mt-2">
                Make sure you&apos;re uploading a valid ChatGPT, Claude, or Gemini export file.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reset button */}
      {result && (
        <div className="text-center">
          <button
            onClick={() => { setResult(null); setPreview(null); }}
            className="px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}