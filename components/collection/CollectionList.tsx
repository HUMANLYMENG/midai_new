'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Album, Track, SortOption, CollectionItem, CollectionItemType } from '@/types';
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

// 封面图片组件 - 简化版
function ItemCover({
  item,
  type
}: {
  item: CollectionItem;
  type: CollectionItemType;
}) {
  const [hasError, setHasError] = useState(false);
  const Icon = type === 'album' ? Disc3 : Music;

  if (!item.coverUrl || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background-tertiary">
        <Icon size={18} className="text-foreground-muted" />
      </div>
    );
  }

  return (
    <img
      src={item.coverUrl}
      alt={item.title}
      className="w-full h-full object-cover"
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
    />
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

// 虚拟列表常量
const ITEM_HEIGHT = 64; // 每个项目的高度
const BUFFER_ITEMS = 3; // 上下缓冲的项目数
const VIRTUAL_SCROLL_THRESHOLD = 50; // 超过此数量启用虚拟滚动

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
  const [scrollTop, setScrollTop] = useState(0);
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
  
  const listRef = useRef<HTMLDivElement>(null);
  const headerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  // 获取首字母
  const getFirstLetter = (item: CollectionItem, sortType: SortOption): string => {
    const key = getSortKey(item, sortType);
    if (!key) return '#';
    const char = key.charAt(0);
    if (/[a-z]/i.test(char)) {
      return char.toUpperCase();
    }
    if (/\d/.test(char)) {
      return '#';
    }
    return char.toUpperCase();
  };

  // 当前显示的项目（已排序）- 使用 useMemo 缓存
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

      if (activeTab === 'track' && 'albumName' in item) {
        const albumName = (item as Track).albumName;
        return matchesBasic || albumName.toLowerCase().includes(query);
      }

      return matchesBasic;
    });
  }, [sortedItems, searchQuery, activeTab]);

  // 生成分组索引
  const { letters, groups, flatItems } = useMemo(() => {
    if (sort === 'default') {
      return { 
        letters: [] as string[], 
        groups: {} as Record<string, CollectionItem[]>,
        flatItems: filteredItems
      };
    }

    const groups: Record<string, CollectionItem[]> = {};
    
    filteredItems.forEach((item) => {
      const letter = getFirstLetter(item, sort);
      if (!groups[letter]) {
        groups[letter] = [];
      }
      groups[letter].push(item);
    });

    const letters = Object.keys(groups).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });

    // 扁平化项目用于虚拟滚动
    const flatItems: Array<{ type: 'header'; letter: string } | { type: 'item'; item: CollectionItem; index: number }> = [];
    letters.forEach((letter) => {
      flatItems.push({ type: 'header', letter });
      groups[letter].forEach((item, index) => {
        flatItems.push({ type: 'item', item, index });
      });
    });

    return { letters, groups, flatItems };
  }, [filteredItems, sort]);

  // 是否启用虚拟滚动
  const enableVirtualScroll = filteredItems.length > VIRTUAL_SCROLL_THRESHOLD;

  // 定义虚拟列表项类型
  type VirtualItem = 
    | { type: 'item'; item: CollectionItem; index: number }
    | { type: 'header'; letter: string };

  // 虚拟滚动计算
  const virtualItems = useMemo(() => {
    if (!enableVirtualScroll) {
      return { items: [] as VirtualItem[], startIndex: 0, totalHeight: 0 };
    }

    const containerHeight = listRef.current?.clientHeight || 600;
    
    // 构建虚拟列表项
    let items: VirtualItem[];
    if (sort === 'default') {
      items = filteredItems.map((item, index) => ({ type: 'item' as const, item, index }));
    } else {
      items = [];
      letters.forEach((letter) => {
        items.push({ type: 'header', letter });
        groups[letter].forEach((item, index) => {
          items.push({ type: 'item', item, index });
        });
      });
    }
    
    const totalHeight = items.length * ITEM_HEIGHT;
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_ITEMS);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_ITEMS
    );

    return {
      items: items.slice(startIndex, endIndex),
      startIndex,
      totalHeight,
    };
  }, [filteredItems, groups, letters, scrollTop, sort, enableVirtualScroll]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

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
    if (sort === 'default') return;
    
    let offset = 0;
    for (const l of letters) {
      if (l === letter) break;
      offset += (groups[l]?.length || 0) * ITEM_HEIGHT + ITEM_HEIGHT; // header + items
    }
    
    listRef.current?.scrollTo({ top: offset, behavior: 'smooth' });
  };

  // 判断是否需要显示字母索引
  const showLetterIndex = sort !== 'default' && letters.length > 0;

  // 渲染单个项目
  const renderItem = (item: CollectionItem, style?: React.CSSProperties) => (
    <div
      key={`${activeTab}-${item.id}`}
      style={style}
      onClick={() => onItemClick(item, activeTab)}
      onContextMenu={(e) => handleContextMenu(e, item, activeTab)}
      className={`
        group flex items-center gap-3 p-2 rounded-xl cursor-pointer
        transition-colors duration-150
        ${isSelected(item, activeTab)
          ? 'bg-accent/20 ring-1 ring-accent/50'
          : 'hover:bg-white/5'
        }
      `}
    >
      {/* Cover */}
      <div
        className={`
        relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0
        ${isSelected(item, activeTab) ? 'ring-2 ring-accent' : ''}
      `}
      >
        <ItemCover item={item} type={activeTab} />
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
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border-color flex-shrink-0 space-y-2">
        <h2 className="text-base font-semibold text-foreground-primary">My Collection</h2>

        {/* Tab Switcher */}
        <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg">
          <button
            type="button"
            onClick={() => onTabChange('album')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-all ${
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
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-all ${
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
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
          />
          <input
            type="text"
            placeholder={`Search ${activeTab}s...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-border-color text-sm placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
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
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Main List */}
        <div 
          ref={listRef}
          onScroll={enableVirtualScroll ? handleScroll : undefined}
          className="flex-1 overflow-y-auto scrollbar-thin p-2"
        >
          {enableVirtualScroll ? (
            // 大数据量 - 使用虚拟滚动
            <div style={{ height: virtualItems.totalHeight, position: 'relative' }}>
              {sort === 'default' ? (
                // 默认排序 - 只有 item 类型
                virtualItems.items.map((entry, i) => {
                  if (entry.type !== 'item') return null;
                  const actualIndex = virtualItems.startIndex + i;
                  return renderItem(entry.item, {
                    position: 'absolute',
                    top: actualIndex * ITEM_HEIGHT,
                    left: 0,
                    right: 0,
                    height: ITEM_HEIGHT - 4,
                  });
                })
              ) : (
                // 分组排序
                virtualItems.items.map((entry, i) => {
                  const actualIndex = virtualItems.startIndex + i;
                  const top = actualIndex * ITEM_HEIGHT;
                  
                  if (entry.type === 'header') {
                    return (
                      <div
                        key={`header-${entry.letter}`}
                        style={{
                          position: 'absolute',
                          top,
                          left: 0,
                          right: 0,
                          height: ITEM_HEIGHT - 4,
                        }}
                        className="flex items-center px-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider bg-background-secondary/95 border-y border-border-color/50"
                      >
                        {entry.letter}
                      </div>
                    );
                  }
                  
                  return renderItem(entry.item, {
                    position: 'absolute',
                    top,
                    left: 0,
                    right: 0,
                    height: ITEM_HEIGHT - 4,
                  });
                })
              )}
            </div>
          ) : (
            // 小数据量 - 直接渲染
            <>
              {sort === 'default' ? (
                // 默认排序
                filteredItems.map((item, index) => renderItem(item))
              ) : (
                // 分组排序
                letters.map((letter) => (
                  <div key={letter}>
                    <div
                      ref={(el) => {
                        if (el) headerRefs.current.set(letter, el);
                      }}
                      className="sticky top-0 z-10 py-2 px-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider bg-background-secondary/95 backdrop-blur-sm border-y border-border-color/50"
                    >
                      {letter}
                    </div>
                    {groups[letter].map((item, index) => renderItem(item))}
                  </div>
                ))
              )}
            </>
          )}

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-foreground-muted">
              {activeTab === 'album' ? (
                <Disc3 size={40} className="mx-auto mb-3 opacity-50" />
              ) : (
                <Music size={40} className="mx-auto mb-3 opacity-50" />
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
          <div className="w-5 flex-shrink-0 py-2 flex flex-col items-center gap-0 overflow-y-auto scrollbar-thin border-l border-border-color/30">
            {letters.map((letter) => (
              <button
                key={letter}
                onClick={() => scrollToLetter(letter)}
                className="w-5 h-5 flex items-center justify-center text-[10px] font-medium text-foreground-muted hover:text-accent hover:bg-accent/10 rounded transition-all flex-shrink-0"
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
