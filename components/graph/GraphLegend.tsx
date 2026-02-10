'use client';

import { memo, useMemo } from 'react';
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
  // 按字母顺序排序
  const sortedGenres = useMemo(() => {
    return [...genres].sort((a, b) => a.localeCompare(b));
  }, [genres]);

  if (genres.length === 0) return null;

  return (
    <div className="z-10">
      {/* 背景更透明：glass-panel 改为自定义样式 */}
      <div className="p-3 rounded-xl max-w-[200px] bg-background-secondary/60 backdrop-blur-md border border-border-color/50 shadow-lg">
        {/* 字体稍大：text-xs 改为 text-sm */}
        <h3 className="text-sm font-semibold text-foreground-primary mb-2 uppercase tracking-wider">
          Genres ({genres.length})
        </h3>
        <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
          {sortedGenres.map((genre) => {
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
                    : 'bg-background-tertiary/40 hover:bg-background-tertiary/70'
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
                {/* 字体稍大：text-[10px] 改为 text-xs */}
                <span className={`text-xs capitalize truncate max-w-[90px] transition-colors ${
                  isSelected ? 'text-foreground-primary font-medium' : 'text-foreground-secondary'
                }`}>
                  {genre}
                </span>
              </button>
            );
          })}
        </div>
        {genres.length > 0 && (
          <p className="text-xs text-foreground-muted mt-2 text-center">
            {genres.length} genres
          </p>
        )}
      </div>
    </div>
  );
});
