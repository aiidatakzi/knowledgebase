'use client';

import { useState, useEffect, useCallback } from 'react';
import GraphView from '@/components/GraphView';
import GraphControls from '@/components/GraphControls';
import DocumentList from '@/components/DocumentList';

interface GraphData {
  nodes: { id: string; label: string; value: number; group: string }[];
  edges: { id: string; from: string; to: string; value: number; title: string }[];
}

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

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState('');
  const [minWeight, setMinWeight] = useState(1);
  const [sources, setSources] = useState<string[]>([]);
  const [relatedDocs, setRelatedDocs] = useState<Doc[]>([]);
  const [selectedNode, setSelectedNode] = useState<{ id: string; label: string } | null>(null);

  // Load sources
  useEffect(() => {
    fetch('/api/import')
      .then((r) => r.json())
      .then((d) => {
        setSources((d.bySource || []).map((s: { source: string }) => s.source).filter(Boolean));
      })
      .catch(() => {});
  }, []);

  // Load graph data
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '100', minWeight: String(minWeight) });
        if (selectedSource) params.set('source', selectedSource);
        const res = await fetch(`/api/graph?${params}`);
        const data = await res.json();
        setGraphData(data);
      } catch (err) {
        console.error('Failed to load graph:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedSource, minWeight]);

  // Handle node click - search for documents with that keyword
  const handleNodeClick = useCallback(async (nodeId: string, label: string) => {
    setSelectedNode({ id: nodeId, label });
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(label)}&limit=10`);
      const data = await res.json();
      setRelatedDocs(
        (data.results || []).map(
          (r: { document: Doc }) => r.document,
        ),
      );
    } catch {
      setRelatedDocs([]);
    }
  }, []);

  return (
    <div className="flex h-full">
      {/* Graph area */}
      <div className="flex-1 flex flex-col p-6 min-w-0">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-100">Knowledge Graph</h2>
          <p className="text-gray-500 mt-1">
            Explore keyword connections across your documents
          </p>
        </div>

        <GraphControls
          sources={sources}
          selectedSource={selectedSource}
          onSourceChange={setSelectedSource}
          minWeight={minWeight}
          onMinWeightChange={setMinWeight}
          nodeCount={graphData.nodes.length}
          edgeCount={graphData.edges.length}
        />

        <div className="flex-1 mt-4">
          {loading ? (
            <div className="graph-container flex items-center justify-center">
              <div className="text-gray-500">Loading graph...</div>
            </div>
          ) : (
            <GraphView data={graphData} onNodeClick={handleNodeClick} />
          )}
        </div>
      </div>

      {/* Sidebar for related documents */}
      {selectedNode && (
        <div className="w-80 border-l border-gray-800 bg-gray-900 p-4 overflow-auto shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-200">
              &ldquo;{selectedNode.label}&rdquo; documents
            </h3>
            <button
              onClick={() => { setSelectedNode(null); setRelatedDocs([]); }}
              className="text-gray-500 hover:text-gray-300 text-sm"
            >
              ✕
            </button>
          </div>
          <DocumentList
            documents={relatedDocs}
            emptyMessage="No documents found for this keyword."
          />
        </div>
      )}
    </div>
  );
}