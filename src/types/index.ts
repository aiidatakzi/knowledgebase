export interface ParsedDocument {
  title: string;
  content: string;
  fileType: 'md' | 'pdf' | 'docx';
  source?: string;
}

export interface DocumentWithKeywords {
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
  indexedAt: string | null;
  keywords: {
    keyword: {
      id: string;
      word: string;
      stem: string;
    };
    score: number;
    count: number;
  }[];
}

export interface SearchResult {
  document: DocumentWithKeywords;
  score: number;
  snippet: string;
  matchType: 'fulltext' | 'semantic';
}

export interface GraphData {
  nodes: {
    id: string;
    label: string;
    value: number;     // size (occurrence count)
    group: string;     // cluster/community
  }[];
  edges: {
    id: string;
    from: string;
    to: string;
    value: number;     // weight
    title: string;     // tooltip
  }[];
}

export interface AppStats {
  totalDocuments: number;
  totalKeywords: number;
  totalEdges: number;
  bySource: { source: string; count: number }[];
  byFileType: { fileType: string; count: number }[];
  recentDocuments: DocumentWithKeywords[];
  topKeywords: { word: string; count: number }[];
}