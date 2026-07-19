interface StatsPanelProps {
  stats: {
    totalDocuments: number;
    totalKeywords: number;
    totalEdges: number;
    bySource: { source: string; count: number }[];
    byFileType: { fileType: string; count: number }[];
  };
}

const sourceIcons: Record<string, string> = {
  claude: '🟠',
  chatgpt: '🟢',
  gemini: '🔵',
};

export default function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Big numbers */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-400">{stats.totalDocuments}</div>
          <div className="text-xs text-gray-500 mt-1">Documents</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats.totalKeywords}</div>
          <div className="text-xs text-gray-500 mt-1">Keywords</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{stats.totalEdges}</div>
          <div className="text-xs text-gray-500 mt-1">Connections</div>
        </div>
      </div>

      {/* Source breakdown */}
      {stats.bySource.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">By Source</h3>
          <div className="space-y-2">
            {stats.bySource.map((s) => (
              <div key={s.source} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">
                  {sourceIcons[s.source] || '⚪'} {s.source || 'Unknown'}
                </span>
                <span className="text-sm text-gray-500">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File type breakdown */}
      {stats.byFileType.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">By File Type</h3>
          <div className="space-y-2">
            {stats.byFileType.map((f) => (
              <div key={f.fileType} className="flex items-center justify-between">
                <span className="text-sm text-gray-300 uppercase">{f.fileType}</span>
                <span className="text-sm text-gray-500">{f.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}