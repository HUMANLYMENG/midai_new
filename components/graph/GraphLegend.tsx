'use client';

import { memo } from 'react';
import { getGenreColor } from '@/lib/genres';

interface GraphLegendProps {
  genres: string[];
}

export const GraphLegend = memo(function GraphLegend({ genres }: GraphLegendProps) {
  if (genres.length === 0) return null;

  // 只显示前10个流派，避免太长
  const displayGenres = genres.slice(0, 10);

  return (
    <div className="absolute top-4 left-4 z-10">
      <div className="glass-panel p-3 rounded-xl max-w-[180px]">
        <h3 className="text-xs font-semibold text-foreground-primary mb-2 uppercase tracking-wider">
          Genres ({genres.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {displayGenres.map((genre) => (
            <div 
              key={genre}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background-tertiary/50"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ 
                  backgroundColor: getGenreColor(genre),
                  boxShadow: `0 0 6px ${getGenreColor(genre)}`
                }}
              />
              <span className="text-[10px] text-foreground-secondary capitalize truncate max-w-[80px]">
                {genre}
              </span>
            </div>
          ))}
        </div>
        {genres.length > 10 && (
          <p className="text-[10px] text-foreground-muted mt-2">
            +{genres.length - 10} more
          </p>
        )}
      </div>
    </div>
  );
});
