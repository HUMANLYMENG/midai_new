'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Album, AlbumInput, Track, TrackInput, SortOption, CollectionItem, CollectionItemType } from '@/types';
import { CollectionList } from '@/components/collection/CollectionList';
import { CollectionForm } from '@/components/collection/CollectionForm';
import { ImportModal } from '@/components/album/ImportModal';
import { ForceGraph } from '@/components/graph/ForceGraph';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Plus, Upload, Menu, X, Disc3, ImageIcon, Loader2, RefreshCw, LogOut, User, MoreVertical } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface CoverStatus {
  total: number;
  withoutCover: number;
  withCover: number;
}

interface BatchProgress {
  isRunning: boolean;
  current: number;
  total: number;
  message: string;
}

export default function CollectionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [sort, setSort] = useState<SortOption>('default');
  const [activeTab, setActiveTab] = useState<CollectionItemType>('album');
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<number | null>(null);
  const [highlightedItemType, setHighlightedItemType] = useState<CollectionItemType | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [coverStatus, setCoverStatus] = useState<CoverStatus | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    isRunning: false,
    current: 0,
    total: 0,
    message: '',
  });
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [imageRefreshKey, setImageRefreshKey] = useState(0);
  const [expandedAlbumId, setExpandedAlbumId] = useState<number | null>(null);

  // 检查登录状态（开发测试时禁用跳转）
  // useEffect(() => {
  //   if (status === 'unauthenticated') {
  //     router.push('/auth/signin');
  //   }
  // }, [status, router]);

  // 原始专辑数据（用于图表，不随排序变化）
  const [rawAlbums, setRawAlbums] = useState<Album[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);

  const fetchAlbums = useCallback(async () => {
    try {
      setIsLoading(true);
      // 获取原始数据（不排序）
      const res = await fetch('/api/albums', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        // 给 coverUrl 添加时间戳来绕过浏览器缓存
        const albumsWithTimestamp = data.data.map((album: Album) => ({
          ...album,
          coverUrl: album.coverUrl
            ? `${album.coverUrl}${album.coverUrl.includes('?') ? '&' : '?'}_t=${imageRefreshKey}`
            : null,
        }));
        setRawAlbums(albumsWithTimestamp);
      }
    } catch (error) {
      console.error('Failed to fetch albums:', error);
    } finally {
      setIsLoading(false);
    }
  }, [imageRefreshKey]);

  const fetchTracks = useCallback(async () => {
    try {
      const res = await fetch('/api/tracks', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        const tracksWithTimestamp = data.data.map((track: Track) => ({
          ...track,
          coverUrl: track.coverUrl
            ? `${track.coverUrl}${track.coverUrl.includes('?') ? '&' : '?'}_t=${imageRefreshKey}`
            : null,
        }));
        setTracks(tracksWithTimestamp);
      }
    } catch (error) {
      console.error('Failed to fetch tracks:', error);
    }
  }, [imageRefreshKey]);

  // 根据排序选项生成列表用的专辑数据
  const sortedAlbums = useMemo(() => {
    if (!sort || sort === 'default') return rawAlbums;
    
    return [...rawAlbums].sort((a, b) => {
      switch (sort) {
        case 'alphabet':
          return a.title.localeCompare(b.title);
        case 'genre':
          return (a.genre || '').localeCompare(b.genre || '');
        case 'artist':
          return a.artist.localeCompare(b.artist);
        case 'label':
          return (a.label || '').localeCompare(b.label || '');
        default:
          return 0;
      }
    });
  }, [rawAlbums, sort]);

  const fetchCoverStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/covers/batch', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) setCoverStatus(data.data);
    } catch (error) {
      console.error('Failed to fetch cover status:', error);
    }
  }, []);

  useEffect(() => {
    fetchAlbums();
    fetchTracks();
    fetchCoverStatus();
  }, [fetchAlbums, fetchTracks, fetchCoverStatus]);

  const handleSubmit = async (formData: AlbumInput | TrackInput, type: CollectionItemType) => {
    try {
      if (selectedItem) {
        const endpoint = type === 'album'
          ? `/api/albums/${selectedItem.id}`
          : `/api/tracks/${selectedItem.id}`;
        await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        const endpoint = type === 'album' ? '/api/albums' : '/api/tracks';
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      fetchAlbums();
      fetchTracks();
      fetchCoverStatus();
    } catch (error) {
      console.error('Failed to save item:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      const endpoint = activeTab === 'album'
        ? `/api/albums/${selectedItem.id}`
        : `/api/tracks/${selectedItem.id}`;
      await fetch(endpoint, { method: 'DELETE' });
      fetchAlbums();
      fetchTracks();
      fetchCoverStatus();
      setIsFormOpen(false);
      setSelectedItem(null);
      setHighlightedItemId(null);
      setHighlightedItemType(null);
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/import', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      fetchAlbums();
      fetchCoverStatus();
      return data.data;
    }
    throw new Error(data.error);
  };

  const handleBatchFetchCovers = async (force: boolean = false) => {
    const totalToFetch = force
      ? (coverStatus?.total || 0)
      : (coverStatus?.withoutCover || 0);

    setBatchProgress({
      isRunning: true,
      current: 0,
      total: totalToFetch,
      message: force ? 'Refreshing all covers...' : 'Fetching missing covers...',
    });
    setShowBatchModal(true);

    try {
      const res = await fetch('/api/covers/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();

      if (data.success) {
        setBatchProgress({
          isRunning: false,
          current: data.data.updated,
          total: data.data.total,
          message: `Completed! Updated: ${data.data.updated}, Failed: ${data.data.failed}`,
        });
        // 递增刷新 key 来强制图片重新加载
        setImageRefreshKey(prev => prev + 1);
        fetchCoverStatus();
      } else {
        setBatchProgress({
          isRunning: false,
          current: 0,
          total: 0,
          message: data.error || 'Failed',
        });
      }
    } catch (error) {
      setBatchProgress({
        isRunning: false,
        current: 0,
        total: 0,
        message: 'Network error',
      });
    }
  };

  const handleItemClick = useCallback((item: CollectionItem, type: CollectionItemType) => {
    setHighlightedItemId(item.id);
    setHighlightedItemType(type);
  }, []);

  const handleItemEdit = useCallback((item: CollectionItem, type: CollectionItemType) => {
    setSelectedItem(item);
    setHighlightedItemId(item.id);
    setHighlightedItemType(type);
    setActiveTab(type);
    setIsFormOpen(true);
  }, []);

  const handleItemDelete = useCallback(async (item: CollectionItem, type: CollectionItemType) => {
    try {
      const endpoint = type === 'album'
        ? `/api/albums/${item.id}`
        : `/api/tracks/${item.id}`;
      await fetch(endpoint, { method: 'DELETE' });
      fetchAlbums();
      fetchTracks();
      fetchCoverStatus();
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
        setIsFormOpen(false);
      }
      if (highlightedItemId === item.id) {
        setHighlightedItemId(null);
        setHighlightedItemType(null);
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  }, [fetchAlbums, fetchTracks, fetchCoverStatus, selectedItem, highlightedItemId]);

  // 单个项目获取封面
  const handleItemFetchCover = useCallback(async (item: CollectionItem, type: CollectionItemType) => {
    try {
      console.log(`[Collection] Fetching cover for: ${item.title}`);
      const res = await fetch('/api/covers/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumIds: type === 'album' ? [item.id] : [],
          trackIds: type === 'track' ? [item.id] : [],
          force: true
        }),
      });
      const data = await res.json();

      if (data.success) {
        const result = data.data.results[0];
        if (result?.status === 'success') {
          console.log(`[Collection] Cover fetched successfully: ${result.coverUrl}`);
          setImageRefreshKey(prev => prev + 1);
          if (type === 'album') {
            fetchAlbums();
          } else {
            fetchTracks();
          }
          fetchCoverStatus();
        } else {
          console.log(`[Collection] Cover fetch failed: ${result?.message || 'Unknown error'}`);
          alert(`Could not find cover for "${item.title}"`);
        }
      } else {
        console.error('[Collection] Cover fetch API error:', data.error);
        alert('Failed to fetch cover');
      }
    } catch (error) {
      console.error('[Collection] Failed to fetch cover:', error);
      alert('Network error while fetching cover');
    }
  }, [fetchAlbums, fetchTracks, fetchCoverStatus]);

  const handleNodeClick = useCallback((item: Album | Track) => {
    if ('albumName' in item) {
      // 单曲
      setSelectedItem(item);
      setHighlightedItemId(item.id);
      setHighlightedItemType('track');
      setActiveTab('track');
    } else {
      // 专辑
      setSelectedItem(item);
      setHighlightedItemId(item.id);
      setHighlightedItemType('album');
      setActiveTab('album');
    }
    setIsFormOpen(true);
  }, []);

  const handleAddNew = () => {
    setSelectedItem(null);
    setHighlightedItemId(null);
    setHighlightedItemType(null);
    setIsFormOpen(true);
  };

  // 显示加载状态
  if (status === 'loading') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background-primary">
        <Disc3 size={48} className="animate-spin text-accent" />
      </div>
    );
  }

  // 未登录也渲染页面（开发测试用）
  // if (!session) {
  //   return null;
  // }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background-primary">
      {/* Navigation */}
      <nav className="nav-capsule">
        <Link href="/" className="nav-item">Home</Link>
        <Link href="/collection" className="nav-item active">Collection</Link>
        <div className="w-px h-6 bg-border-color mx-1" />
        <ThemeToggle />
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden pt-24 px-4 pb-4">
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-2xl overflow-hidden bg-background-secondary/50 backdrop-blur-sm border border-border-color mr-4 flex-shrink-0"
            >
              <CollectionList
                albums={rawAlbums}
                tracks={tracks}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                sort={sort}
                onSortChange={setSort}
                onItemClick={handleItemClick}
                onItemEdit={handleItemEdit}
                onItemDelete={handleItemDelete}
                onItemFetchCover={handleItemFetchCover}
                selectedItemId={highlightedItemId}
                selectedItemType={highlightedItemType}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Graph Area - 填满剩余空间 */}
        <div className="flex-1 h-full relative min-w-0">
          {/* Toolbar */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            {/* 批量获取封面按钮 - 当有需要时显示 */}
            {coverStatus && coverStatus.withoutCover > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBatchFetchCovers(false)}
                disabled={batchProgress.isRunning}
                className="flex items-center gap-1"
                title="获取缺失封面的专辑"
              >
                {batchProgress.isRunning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ImageIcon size={14} />
                )}
                Get {coverStatus.withoutCover} Covers
              </Button>
            )}
            {/* 刷新所有封面按钮 - 始终显示 */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (confirm('确定要重新获取所有专辑封面吗？这将覆盖已有的封面。')) {
                  handleBatchFetchCovers(true);
                }
              }}
              disabled={batchProgress.isRunning}
              className="flex items-center gap-1"
              title="强制重新获取所有专辑封面"
            >
              {batchProgress.isRunning ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Refresh All
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsImportOpen(true)}>
              <Upload size={16} />
            </Button>
            <Button size="sm" onClick={handleAddNew}>
              <Plus size={16} />
            </Button>
          </div>

          {/* Graph - 填满容器 */}
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center glass-panel rounded-2xl">
              <Disc3 size={32} className="animate-spin text-foreground-muted" />
            </div>
          ) : (
            <ForceGraph
              albums={rawAlbums}
              tracks={tracks}
              onNodeClick={handleNodeClick}
              highlightedItemId={highlightedItemId}
              highlightedItemType={highlightedItemType}
              expandedAlbumId={expandedAlbumId}
              onAlbumExpand={setExpandedAlbumId}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <CollectionForm
        item={selectedItem}
        itemType={activeTab}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedItem(null);
        }}
        onSubmit={handleSubmit}
        onDelete={selectedItem ? handleDelete : undefined}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
      />

      {/* Batch Progress Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-background-secondary rounded-2xl p-6 w-96 border border-border-color shadow-xl"
          >
            <h3 className="text-lg font-semibold mb-4">Fetching Covers</h3>
            
            {batchProgress.isRunning ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 size={24} className="animate-spin text-accent" />
                  <span>{batchProgress.message}</span>
                </div>
                <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-300"
                    style={{ 
                      width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` 
                    }}
                  />
                </div>
                <p className="text-sm text-foreground-muted text-center">
                  {batchProgress.current} / {batchProgress.total}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-500">
                  <RefreshCw size={20} />
                  <span>{batchProgress.message}</span>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => setShowBatchModal(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
