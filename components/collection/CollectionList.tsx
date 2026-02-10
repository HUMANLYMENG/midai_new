'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
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
  
  // 用于滚动的 ref
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // 获取排序键值
  const getSortKey = (item: CollectionItem, sortType: SortOption): string => {
    switch (sortType) {
      case 'alphabet':
        return item.title.toLowerCase();
      case 'artist':
        return item.artist.toLowerCase();
      case 'genre':
        return (item.genre || '').toLowerCase();
      case 'label':
        return (item.label || '').toLowerCase();
      case 'album':
        if ('albumName' in item) {
          return item.albumName.toLowerCase();
        }
        return item.title.toLowerCase();
      default:
        return '';
    }
  };

  // 获取首字母（用于索引）
  const getFirstLetter = (item: CollectionItem, sortType: SortOption): string => {
    const key = getSortKey(item, sortType);
    if (!key) return '#';
    const char = key.charAt(0);
    // 如果是英文字母，返回大写
    if (/[a-z]/i.test(char)) {
      return char.toUpperCase();
    }
    // 如果是数字，归为 #
    if (/\d/.test(char)) {
      return '#';
    }
    // 其他字符（如中文），尝试用拼音首字母或返回原字符
    return char.toUpperCase();
  };

  // 当前显示的项目（已排序）
  const sortedItems = useMemo(() => {
    const items = activeTab === 'album' ? albums : tracks;
    
    if (!sort || sort === 'default') {
      return items;
    }
    
    return [...items].sort((a, b) => {
      const keyA = getSortKey(a, sort);
      const keyB = getSortKey(b, sort);
      return keyA.localeCompare(keyB);
    });
  }, [activeTab, albums, tracks, sort]);

  // 过滤项目
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return sortedItems;

    const query = searchQuery.toLowerCase();
    return sortedItems.filter((item) => {
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
  }, [sortedItems, searchQuery, activeTab]);

  // 生成分组索引（仅对 genre/artist/label/alphabet 排序）
  const groupedItems = useMemo(() => {
    if (sort === 'default') {
      return { letters: [] as string[], groups: {} as Record<string, CollectionItem[]> };
    }

    const groups: Record<string, CollectionItem[]> = {};
    
    filteredItems.forEach((item) => {
      const letter = getFirstLetter(item, sort);
      if (!groups[letter]) {
        groups[letter] = [];
      }
      groups[letter].push(item);
    });

    // 排序字母
    const letters = Object.keys(groups).sort((a, b) => {
      // # 排在最后
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });

    return { letters, groups };
  }, [filteredItems, sort]);

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

  // 滚动到指定字母
  const scrollToLetter = (letter: string) => {
    const element = itemRefs.current.get(`header-${letter}`);
    if (element && listRef.current) {
      const listRect = listRef.current.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const scrollTop = listRef.current.scrollTop + elementRect.top - listRect.top;
      listRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
  };

  // 渲染列表项
  const renderItem = (item: CollectionItem, index: number) => (
    <motion.div
      key={`${activeTab}-${item.id}`}
      ref={(el) => {
        if (el) itemRefs.current.set(`${activeTab}-${item.id}`, el);
      }}
      layout
      layoutId={`${activeTab}-${item.id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.01, 0.3) }}
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
  );

  // 判断是否需要显示字母索引
  const showLetterIndex = sort !== 'default' && groupedItems.letters.length > 0;

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

      {/* List with Letter Index */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main List */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 scrollbar-thin"
        >
          {sort === 'default' ? (
            // 默认排序 - 不分组
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, index) => renderItem(item, index))}
            </AnimatePresence>
          ) : (
            // 分组排序
            <AnimatePresence mode="popLayout">
              {groupedItems.letters.map((letter) => (
                <div key={letter}>
                  {/* Group Header */}
                  <div
                    ref={(el) => {
                      if (el) itemRefs.current.set(`header-${letter}`, el);
                    }}
                    className="sticky top-0 z-10 py-2 px-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider bg-background-secondary/80 backdrop-blur-sm border-y border-border-color/50"
                  >
                    {letter}
                  </div>
                  {/* Group Items */}
                  {groupedItems.groups[letter].map((item, index) => renderItem(item, index))}
                </div>
              ))}
            </AnimatePresence>
          )}

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

        {/* Letter Index Sidebar */}
        {showLetterIndex && (
          <div className="w-6 flex-shrink-0 py-2 flex flex-col items-center gap-0.5 overflow-y-auto scrollbar-thin border-l border-border-color/30">
            {groupedItems.letters.map((letter) => (
              <button
                key={letter}
                onClick={() => scrollToLetter(letter)}
                className="w-5 h-5 flex items-center justify-center text-[10px] font-medium text-foreground-muted hover:text-accent hover:bg-accent/10 rounded transition-all"
                title={`Jump to ${letter}`}
              >
                {letter}
              </button>
            ))}
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
