interface KeywordCloudProps {
  keywords: { word: string; count: number }[];
  onKeywordClick?: (word: string) => void;
}

export default function KeywordCloud({ keywords, onKeywordClick }: KeywordCloudProps) {
  if (keywords.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No keywords yet. Index some documents to see them here.
      </div>
    );
  }

  const maxCount = Math.max(...keywords.map((k) => k.count), 1);

  return (
    <div className="keyword-cloud flex flex-wrap gap-2 p-4 bg-gray-900 rounded-xl border border-gray-800">
      {keywords.map((kw) => {
        const size = 0.7 + (kw.count / maxCount) * 1.3; // 0.7rem to 2rem
        const opacity = 0.4 + (kw.count / maxCount) * 0.6;

        return (
          <span
            key={kw.word}
            onClick={() => onKeywordClick?.(kw.word)}
            className="cursor-pointer hover:text-indigo-300 transition-colors"
            style={{
              fontSize: `${size}rem`,
              opacity,
              color: `rgb(${99 + Math.floor(opacity * 100)}, ${102 + Math.floor(opacity * 80)}, ${241})`,
            }}
            title={`${kw.word} (${kw.count})`}
          >
            {kw.word}
          </span>
        );
      })}
    </div>
  );
}