'use client';

import { useMemo, useState, useCallback } from 'react';
import { Album, SortOption } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc3, Edit3, Trash2, Target, Search, ImageIcon } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { ContextMenu } from '@/components/ui/ContextMenu';

// Context menu item type
interface MenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

// 封面图片组件，带错误处理
function AlbumCover({ album, isSelected }: { album: Album; isSelected: boolean }) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!album.coverUrl || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background-tertiary">
        <Disc3 size={22} className="text-foreground-muted" />
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background-tertiary">
          <Disc3 size={22} className="text-foreground-muted animate-pulse" />
        </div>
      )}
      <img
        src={album.coverUrl}
        alt={album.title}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
          console.error(`[AlbumList] Failed to load cover for: ${album.title}`);
        }}
        loading="lazy"
      />
    </>
  );
}

interface AlbumListProps {
  albums: Album[];
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  onAlbumClick: (album: Album) => void;
  onAlbumEdit?: (album: Album) => void;
  onAlbumDelete?: (album: Album) => void;
  onAlbumFetchCover?: (album: Album) => void;
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
  onAlbumFetchCover,
  selectedAlbumId,
}: AlbumListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    album: Album | null;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    album: null
  });

  // Filter albums based on search query
  const filteredAlbums = useMemo(() => {
    if (!searchQuery.trim()) return albums;

    const query = searchQuery.toLowerCase();
    return albums.filter(album =>
      album.title.toLowerCase().includes(query) ||
      album.artist.toLowerCase().includes(query) ||
      (album.genre && album.genre.toLowerCase().includes(query))
    );
  }, [albums, searchQuery]);

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

  const contextMenuItems = useMemo((): MenuItem[] => {
    if (!contextMenu.album) return [];

    const items: MenuItem[] = [
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
      }
    ];

    // 添加获取封面按钮（如果没有封面）
    if (!contextMenu.album!.coverUrl && onAlbumFetchCover) {
      items.push({
        label: 'Fetch Cover',
        icon: <ImageIcon size={16} />,
        onClick: () => {
          onAlbumFetchCover(contextMenu.album!);
        }
      });
    }

    items.push({
      label: 'Delete Album',
      icon: <Trash2 size={16} />,
      danger: true,
      onClick: () => {
        if (confirm(`Delete "${contextMenu.album!.title}"?`)) {
          onAlbumDelete?.(contextMenu.album!);
        }
      }
    });

    return items;
  }, [contextMenu.album, onAlbumClick, onAlbumEdit, onAlbumDelete, onAlbumFetchCover]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border-color flex-shrink-0 space-y-3">
        <h2 className="text-lg font-semibold text-foreground-primary">My Collection</h2>

        {/* Search Box */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            placeholder="Search albums, artists, genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-background-tertiary/50 border border-border-color text-sm text-foreground-primary placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
          />
        </div>

        <Select
          label="Sort by"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          options={sortOptions}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {filteredAlbums.map((album, index) => (
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
                <AlbumCover album={album} isSelected={selectedAlbumId === album.id} />
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

        {filteredAlbums.length === 0 && (
          <div className="text-center py-8 text-foreground-muted">
            <Disc3 size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {searchQuery ? 'No albums found' : 'No albums yet'}
            </p>
            <p className="text-xs mt-1">
              {searchQuery ? 'Try a different search' : 'Right click to add'}
            </p>
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
