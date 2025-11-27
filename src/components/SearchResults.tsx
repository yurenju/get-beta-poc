import type { SearchResult } from '../lib/matching';
import { RouteCard } from './RouteCard';

interface SearchResultsProps {
  results: SearchResult[];
  getImageUrl: (filename: string) => Promise<string>;
  onRouteClick: (result: SearchResult) => void;
}

/**
 * 搜尋結果列表元件
 */
export function SearchResults({
  results,
  getImageUrl,
  onRouteClick
}: SearchResultsProps) {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className="search-results">
      {results.map(result => (
        <RouteCard
          key={result.route.id}
          route={result.route}
          similarity={result.similarity}
          matchedImageId={result.matchedImageId}
          getImageUrl={getImageUrl}
          onClick={() => onRouteClick(result)}
        />
      ))}
    </div>
  );
}
