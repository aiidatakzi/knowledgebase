'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface GraphNode {
  id: string;
  label: string;
  value: number;
  group: string;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  value: number;
  title: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface GraphViewProps {
  data: GraphData;
  onNodeClick?: (nodeId: string, label: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DataSetType = any;

export default function GraphView({ data, onNodeClick }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const networkRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  const initGraph = useCallback(async () => {
    if (!containerRef.current || data.nodes.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const visNetwork = await import('vis-network/standalone');
      const visData = await import('vis-data/standalone');
      const Network = visNetwork.Network;
      const DataSet = visData.DataSet as new (items: object[]) => DataSetType;

      const nodes = new DataSet(
        data.nodes.map((n) => ({
          id: n.id,
          label: n.label,
          value: n.value,
          group: n.group,
          color: {
            background: '#6366f1',
            border: '#4f46e5',
            highlight: { background: '#818cf8', border: '#6366f1' },
          },
          font: { color: '#d1d5db', size: 12 },
        })),
      );

      const edges = new DataSet(
        data.edges.map((e) => ({
          id: e.id,
          from: e.from,
          to: e.to,
          value: e.value,
          title: e.title,
          color: { color: '#374151', highlight: '#6366f1', hover: '#6366f1' },
          smooth: { enabled: true, type: 'continuous', roundness: 0.5 },
        })),
      );

      const options = {
        physics: {
          stabilization: { iterations: 100 },
          barnesHut: {
            gravitationalConstant: -2000,
            centralGravity: 0.3,
            springLength: 150,
            springConstant: 0.04,
            damping: 0.09,
          },
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          zoomView: true,
          dragView: true,
        },
      };

      const network = new Network(containerRef.current, { nodes, edges } as object, options);
      networkRef.current = network;

      if (onNodeClick) {
        network.on('click', (params: { nodes: string[] }) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const node = data.nodes.find((n) => n.id === nodeId);
            if (node) {
              onNodeClick(nodeId, node.label);
            }
          }
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to initialize graph:', err);
      setLoading(false);
    }
  }, [data, onNodeClick]);

  useEffect(() => {
    initGraph();

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy?.();
      }
    };
  }, [initGraph]);

  if (loading) {
    return (
      <div className="graph-container flex items-center justify-center">
        <div className="text-gray-500">Loading graph...</div>
      </div>
    );
  }

  if (data.nodes.length === 0) {
    return (
      <div className="graph-container flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-3">⬡</div>
          <p>No graph data available.</p>
          <p className="text-sm mt-1">Index more documents to build keyword connections.</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="graph-container" />;
}