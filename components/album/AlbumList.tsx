'use client';

import { useMemo, useState, useCallback } from 'react';
import { Album, SortOption } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc3, Edit3, Trash2, Target } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { ContextMenu } from '@/components/ui/ContextMenu';

interface AlbumListProps {
  albums: Album[];
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  onAlbumClick: (album: Album) => void;
  onAlbumEdit?: (album: Album) => void;
  onAlbumDelete?: (album: Album) => void;
  selectedAlbumId?: number | null;
}

const sortOptions = [
  { value: 'default', label: 'Default' },
  { value: 'alphabet', label: 'Alphabet' },
  { value: 'genre', label: 'Genre' },
  { value: 'artist', label: 'Artist' },
  { value: 'label', label: 'Label' },
];

export function AlbumList({
  albums,
  sort,
  onSortChange,
  onAlbumClick,
  onAlbumEdit,
  onAlbumDelete,
  selectedAlbumId,
}: AlbumListProps) {
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    album: Album | null;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    album: null
  });

  const handleContextMenu = useCallback((e: React.MouseEvent, album: Album) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      album
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  const contextMenuItems = useMemo(() => {
    if (!contextMenu.album) return [];
    
    return [
      {
        label: 'Focus in Graph',
        icon: <Target size={16} />,
        onClick: () => {
          onAlbumClick(contextMenu.album!);
        }
      },
      {
        label: 'Edit Album',
        icon: <Edit3 size={16} />,
        onClick: () => {
          onAlbumEdit?.(contextMenu.album!);
        }
      },
      {
        label: 'Delete Album',
        icon: <Trash2 size={16} />,
        danger: true,
        onClick: () => {
          if (confirm(`Delete "${contextMenu.album!.title}"?`)) {
            onAlbumDelete?.(contextMenu.album!);
          }
        }
      }
    ];
  }, [contextMenu.album, onAlbumClick, onAlbumEdit, onAlbumDelete]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border-color flex-shrink-0">
        <h2 className="text-lg font-semibold text-foreground-primary mb-3">My Collection</h2>
        <Select
          label="Sort by"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          options={sortOptions}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {albums.map((album, index) => (
            <motion.div
              key={album.id}
              layout
              layoutId={`album-${album.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.02 }}
              onClick={() => onAlbumClick(album)}
              onContextMenu={(e) => handleContextMenu(e, album)}
              className={`
                group flex items-center gap-3 p-3 rounded-xl cursor-pointer 
                transition-all duration-200 ease-out
                ${selectedAlbumId === album.id 
                  ? 'bg-accent/20 ring-1 ring-accent/50' 
                  : 'hover:bg-white/5'
                }
              `}
            >
              {/* Cover */}
              <div className={`
                relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0
                transition-transform duration-200
                ${selectedAlbumId === album.id ? 'ring-2 ring-accent' : ''}
              `}>
                {album.coverUrl ? (
                  <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-background-tertiary">
                    <Disc3 size={22} className="text-foreground-muted" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground-primary truncate">
                  {album.title}
                </p>
                <p className="text-xs text-foreground-secondary truncate">
                  {album.artist}
                </p>
                {album.genre && (
                  <p className="text-xs text-foreground-muted truncate">
                    {album.genre.split(',')[0]}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {albums.length === 0 && (
          <div className="text-center py-8 text-foreground-muted">
            <Disc3 size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No albums yet</p>
            <p className="text-xs mt-1">Right click to add</p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        items={contextMenuItems}
        onClose={closeContextMenu}
      />
    </div>
  );
}
