'use client';

import { useMemo, useState, useCallback } from 'react';
import { Album, Track, SortOption, CollectionItem, CollectionItemType } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Disc3, Music, Edit3, Trash2, Target, Search, ImageIcon } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { ContextMenu } from '@/components/ui/ContextMenu';

// Context menu item type
interface MenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

// 封面图片组件
function ItemCover({
  item,
  isSelected,
  type
}: {
  item: CollectionItem;
  isSelected: boolean;
  type: CollectionItemType;
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const Icon = type === 'album' ? Disc3 : Music;

  if (!item.coverUrl || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background-tertiary">
        <Icon size={20} className="text-foreground-muted" />
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background-tertiary">
          <Icon size={20} className="text-foreground-muted animate-pulse" />
        </div>
      )}
      <img
        src={item.coverUrl}
        alt={item.title}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        loading="lazy"
      />
    </>
  );
}

interface CollectionListProps {
  albums: Album[];
  tracks: Track[];
  activeTab: CollectionItemType;
  onTabChange: (tab: CollectionItemType) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  onItemClick: (item: CollectionItem, type: CollectionItemType) => void;
  onItemEdit?: (item: CollectionItem, type: CollectionItemType) => void;
  onItemDelete?: (item: CollectionItem, type: CollectionItemType) => void;
  onItemFetchCover?: (item: CollectionItem, type: CollectionItemType) => void;
  selectedItemId?: number | null;
  selectedItemType?: CollectionItemType | null;
}

const sortOptions = [
  { value: 'default', label: 'Default' },
  { value: 'alphabet', label: 'Alphabet' },
  { value: 'genre', label: 'Genre' },
  { value: 'artist', label: 'Artist' },
  { value: 'label', label: 'Label' },
  { value: 'album', label: 'Album' },
];

export function CollectionList({
  albums,
  tracks,
  activeTab,
  onTabChange,
  sort,
  onSortChange,
  onItemClick,
  onItemEdit,
  onItemDelete,
  onItemFetchCover,
  selectedItemId,
  selectedItemType,
}: CollectionListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    item: CollectionItem | null;
    type: CollectionItemType | null;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    item: null,
    type: null,
  });

  // 当前显示的项目
  const currentItems = useMemo(() => {
    return activeTab === 'album' ? albums : tracks;
  }, [activeTab, albums, tracks]);

  // 过滤项目
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return currentItems;

    const query = searchQuery.toLowerCase();
    return currentItems.filter((item) => {
      const matchesBasic =
        item.title.toLowerCase().includes(query) ||
        item.artist.toLowerCase().includes(query) ||
        (item.genre && item.genre.toLowerCase().includes(query));

      // 单曲额外匹配专辑名
      if (activeTab === 'track' && 'albumName' in item) {
        const albumName = (item as Track).albumName;
        return matchesBasic || albumName.toLowerCase().includes(query);
      }

      return matchesBasic;
    });
  }, [currentItems, searchQuery, activeTab]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: CollectionItem, type: CollectionItemType) => {
      e.preventDefault();
      setContextMenu({
        isOpen: true,
        position: { x: e.clientX, y: e.clientY },
        item,
        type,
      });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const contextMenuItems = useMemo((): MenuItem[] => {
    if (!contextMenu.item || !contextMenu.type) return [];

    const isAlbum = contextMenu.type === 'album';
    const items: MenuItem[] = [
      {
        label: 'Focus in Graph',
        icon: <Target size={16} />,
        onClick: () => {
          onItemClick(contextMenu.item!, contextMenu.type!);
        },
      },
      {
        label: `Edit ${isAlbum ? 'Album' : 'Track'}`,
        icon: <Edit3 size={16} />,
        onClick: () => {
          onItemEdit?.(contextMenu.item!, contextMenu.type!);
        },
      },
    ];

    // 添加获取封面按钮
    if (!contextMenu.item!.coverUrl && onItemFetchCover) {
      items.push({
        label: 'Fetch Cover',
        icon: <ImageIcon size={16} />,
        onClick: () => {
          onItemFetchCover(contextMenu.item!, contextMenu.type!);
        },
      });
    }

    items.push({
      label: `Delete ${isAlbum ? 'Album' : 'Track'}`,
      icon: <Trash2 size={16} />,
      danger: true,
      onClick: () => {
        const itemTitle = contextMenu.item!.title;
        if (confirm(`Delete "${itemTitle}"?`)) {
          onItemDelete?.(contextMenu.item!, contextMenu.type!);
        }
      },
    });

    return items;
  }, [contextMenu.item, contextMenu.type, onItemClick, onItemEdit, onItemDelete, onItemFetchCover]);

  const isSelected = (item: CollectionItem, type: CollectionItemType) => {
    return selectedItemId === item.id && selectedItemType === type;
  };

  const getItemSubtitle = (item: CollectionItem) => {
    if ('albumName' in item) {
      return `${item.artist} • ${item.albumName}`;
    }
    return item.artist;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border-color flex-shrink-0 space-y-3">
        <h2 className="text-lg font-semibold text-foreground-primary">My Collection</h2>

        {/* Tab Switcher */}
        <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg">
          <button
            type="button"
            onClick={() => onTabChange('album')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'album'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Disc3 className="w-4 h-4" />
            Albums ({albums.length})
          </button>
          <button
            type="button"
            onClick={() => onTabChange('track')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'track'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Music className="w-4 h-4" />
            Tracks ({tracks.length})
          </button>
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
          />
          <input
            type="text"
            placeholder={`Search ${activeTab}s, artists, genres...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border-color text-sm placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
            }}
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
          {filteredItems.map((item, index) => (
            <motion.div
              key={`${activeTab}-${item.id}`}
              layout
              layoutId={`${activeTab}-${item.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.02 }}
              onClick={() => onItemClick(item, activeTab)}
              onContextMenu={(e) => handleContextMenu(e, item, activeTab)}
              className={`
                group flex items-center gap-3 p-3 rounded-xl cursor-pointer
                transition-all duration-200 ease-out
                ${isSelected(item, activeTab)
                  ? 'bg-accent/20 ring-1 ring-accent/50'
                  : 'hover:bg-white/5'
                }
              `}
            >
              {/* Cover */}
              <div
                className={`
                relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0
                transition-transform duration-200
                ${isSelected(item, activeTab) ? 'ring-2 ring-accent' : ''}
              `}
              >
                <ItemCover item={item} isSelected={isSelected(item, activeTab)} type={activeTab} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground-primary truncate">
                  {item.title}
                </p>
                <p className="text-xs text-foreground-secondary truncate">
                  {getItemSubtitle(item)}
                </p>
                {item.genre && (
                  <p className="text-xs text-foreground-muted truncate">
                    {item.genre.split(',')[0]}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-foreground-muted">
            {activeTab === 'album' ? (
              <Disc3 size={48} className="mx-auto mb-3 opacity-50" />
            ) : (
              <Music size={48} className="mx-auto mb-3 opacity-50" />
            )}
            <p className="text-sm">
              {searchQuery ? `No ${activeTab}s found` : `No ${activeTab}s yet`}
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
