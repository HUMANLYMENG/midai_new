'use client';

import { memo } from 'react';
import { getGenreColor } from '@/lib/genres';

interface GraphLegendProps {
  genres: string[];
  selectedGenre: string | null;
  onGenreClick: (genre: string) => void;
}

export const GraphLegend = memo(function GraphLegend({ 
  genres, 
  selectedGenre,
  onGenreClick 
}: GraphLegendProps) {
  if (genres.length === 0) return null;

  return (
    <div className="z-10">
      <div className="glass-panel p-3 rounded-xl max-w-[180px]">
        <h3 className="text-xs font-semibold text-foreground-primary mb-2 uppercase tracking-wider">
          Genres ({genres.length})
        </h3>
        <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
          {genres.map((genre) => {
            const isSelected = selectedGenre === genre;
            return (
              <button
                key={genre}
                onClick={() => onGenreClick(genre)}
                className={`
                  flex items-center gap-1.5 px-2 py-1 rounded-full 
                  transition-all duration-200
                  ${isSelected 
                    ? 'bg-accent/30 ring-1 ring-accent shadow-[0_0_8px_rgba(100,180,255,0.5)]' 
                    : 'bg-background-tertiary/50 hover:bg-background-tertiary'
                  }
                `}
              >
                <span
                  className={`rounded-full transition-all duration-200 ${isSelected ? 'w-2.5 h-2.5' : 'w-2 h-2'}`}
                  style={{ 
                    backgroundColor: getGenreColor(genre),
                    boxShadow: isSelected 
                      ? `0 0 10px ${getGenreColor(genre)}` 
                      : `0 0 6px ${getGenreColor(genre)}`
                  }}
                />
                <span className={`text-[10px] capitalize truncate max-w-[80px] transition-colors ${
                  isSelected ? 'text-foreground-primary font-medium' : 'text-foreground-secondary'
                }`}>
                  {genre}
                </span>
              </button>
            );
          })}
        </div>
        {genres.length > 0 && (
          <p className="text-[10px] text-foreground-muted mt-2 text-center">
            {genres.length} genres
          </p>
        )}
      </div>
    </div>
  );
});
