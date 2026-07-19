'use client';

interface GraphControlsProps {
  sources: string[];
  selectedSource: string;
  onSourceChange: (source: string) => void;
  minWeight: number;
  onMinWeightChange: (weight: number) => void;
  nodeCount: number;
  edgeCount: number;
}

export default function GraphControls({
  sources,
  selectedSource,
  onSourceChange,
  minWeight,
  onMinWeightChange,
  nodeCount,
  edgeCount,
}: GraphControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl">
      {/* Source filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 uppercase tracking-wider">Source</label>
        <select
          value={selectedSource}
          onChange={(e) => onSourceChange(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Min weight filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 uppercase tracking-wider">
          Min Weight: {minWeight}
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={minWeight}
          onChange={(e) => onMinWeightChange(parseInt(e.target.value))}
          className="accent-indigo-500 w-24"
        />
      </div>

      {/* Stats */}
      <div className="ml-auto flex items-center gap-4 text-sm text-gray-500">
        <span>
          <span className="text-indigo-400 font-medium">{nodeCount}</span> nodes
        </span>
        <span>
          <span className="text-emerald-400 font-medium">{edgeCount}</span> edges
        </span>
      </div>
    </div>
  );
}