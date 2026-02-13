'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Album, AlbumInput, Track, TrackInput, SortOption, CollectionItem, CollectionItemType } from '@/types';
import { CollectionList } from '@/components/collection/CollectionList';
import { CollectionForm } from '@/components/collection/CollectionForm';
import { UnifiedImportModal } from '@/components/collection/UnifiedImportModal';
import { ForceGraph } from '@/components/graph/ForceGraph';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Plus, Upload, Menu, X, Disc3, ImageIcon, Loader2, RefreshCw, LogOut, User, MoreVertical, Code } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// 开发环境标志
const isDevAutoLogin = process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === 'true';

interface CoverStatus {
  albums: {
    total: number;
    withoutCover: number;
    withCover: number;
  };
  withoutCover: number; // 只统计专辑缺失封面的数量
}

interface GenreStatus {
  tracks: {
    total: number;
    missing: number;
  };
  albums: {
    total: number;
    missing: number;
  };
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
  
  // Genre fix status
  const [genreStatus, setGenreStatus] = useState<GenreStatus | null>(null);
  const [genreFixProgress, setGenreFixProgress] = useState<BatchProgress>({
    isRunning: false,
    current: 0,
    total: 0,
    message: '',
  });
  const [showGenreFixModal, setShowGenreFixModal] = useState(false);

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

  const fetchGenreStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/genres/fix', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) setGenreStatus(data.data);
    } catch (error) {
      console.error('Failed to fetch genre status:', error);
    }
  }, []);

  useEffect(() => {
    fetchAlbums();
    fetchTracks();
    fetchCoverStatus();
    fetchGenreStatus();
  }, [fetchAlbums, fetchTracks, fetchCoverStatus, fetchGenreStatus]);

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
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          if (data.error) {
            alert(data.error);
          }
          return;
        }
        
        // 如果 track 创建了专辑，显示提示
        if (type === 'track' && data.albumCreated) {
          console.log(`[Collection] Auto-created album with ID: ${data.albumId}`);
        }
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

  const handlePlaylistImport = async (
    url: string, 
    onProgress?: (current: number, total: number) => void
  ) => {
    return new Promise<{ 
      success: boolean; 
      imported: number; 
      skipped: number; 
      errors: string[];
      playlistName?: string;
    }>((resolve, reject) => {
      const encodedUrl = encodeURIComponent(url);
      const eventSource = new EventSource(`/api/playlist/import/sse?url=${encodedUrl}`);
      
      let playlistName = '';
      let totalSongs = 0;
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'playlist':
            playlistName = data.playlistName;
            totalSongs = data.total;
            break;
            
          case 'progress':
            if (onProgress) {
              onProgress(data.current, data.total);
            }
            break;
            
          case 'complete':
            eventSource.close();
            const results = data.data;
            // Refresh data
            Promise.all([fetchAlbums(), fetchTracks(), fetchCoverStatus()]).then(() => {
              resolve({
                success: true,
                imported: results.imported,
                skipped: results.skipped,
                errors: results.errors,
                playlistName: results.playlistName,
              });
            });
            break;
            
          case 'error':
            eventSource.close();
            reject(new Error(data.error || 'Import failed'));
            break;
        }
      };
      
      eventSource.onerror = (error) => {
        eventSource.close();
        reject(new Error('Connection error'));
      };
    });
  };

  const handleBatchFetchCovers = async (force: boolean = false) => {
    setBatchProgress({
      isRunning: true,
      current: 0,
      total: 0,
      message: force ? 'Refreshing all covers...' : 'Fetching missing covers...',
    });
    setShowBatchModal(true);

    try {
      // 使用 SSE 获取实时进度
      const eventSource = new EventSource(`/api/covers/batch-process?force=${force}`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'start':
            setBatchProgress(prev => ({
              ...prev,
              total: data.total,
              message: data.message,
            }));
            break;
            
          case 'progress':
            setBatchProgress(prev => ({
              ...prev,
              current: data.current,
              total: data.total,
              message: `Processing: ${data.item}`,
            }));
            break;
            
          case 'complete':
            eventSource.close();
            setBatchProgress({
              isRunning: false,
              current: data.updated,
              total: data.total,
              message: data.message,
            });
            // 刷新数据
            setImageRefreshKey(prev => prev + 1);
            fetchAlbums();
            fetchTracks();
            fetchCoverStatus();
            break;
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        eventSource.close();
        setBatchProgress({
          isRunning: false,
          current: 0,
          total: 0,
          message: 'Connection error',
        });
      };
      
    } catch (error) {
      console.error('Batch fetch error:', error);
      setBatchProgress({
        isRunning: false,
        current: 0,
        total: 0,
        message: 'Network error',
      });
    }
  };

  const handleFixMissingGenres = async () => {
    setGenreFixProgress({
      isRunning: true,
      current: 0,
      total: 0,
      message: 'Fetching missing genres...',
    });
    setShowGenreFixModal(true);

    try {
      const eventSource = new EventSource('/api/genres/fix/sse?type=both&mode=missing');
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'start':
            setGenreFixProgress(prev => ({
              ...prev,
              message: data.message,
            }));
            break;
            
          case 'total':
            setGenreFixProgress(prev => ({
              ...prev,
              total: data.total,
              message: `Found ${data.total} items to fix`,
            }));
            break;
            
          case 'progress':
            setGenreFixProgress(prev => ({
              ...prev,
              current: data.current,
              total: data.total,
              message: `Processing: ${data.item || data.current + '/' + data.total}`,
            }));
            break;
            
          case 'batch':
            setGenreFixProgress(prev => ({
              ...prev,
              current: data.completed,
              message: `Batch ${data.batch}: ${data.message}`,
            }));
            break;
            
          case 'complete':
            eventSource.close();
            setGenreFixProgress({
              isRunning: false,
              current: data.total,
              total: data.total,
              message: data.message,
            });
            // 刷新数据
            fetchAlbums();
            fetchTracks();
            fetchGenreStatus();
            break;
            
          case 'error':
            eventSource.close();
            setGenreFixProgress({
              isRunning: false,
              current: 0,
              total: 0,
              message: `Error: ${data.message}`,
            });
            break;
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('Genre fix SSE error:', error);
        eventSource.close();
        setGenreFixProgress({
          isRunning: false,
          current: 0,
          total: 0,
          message: 'Connection error',
        });
      };
      
    } catch (error) {
      console.error('Genre fix error:', error);
      setGenreFixProgress({
        isRunning: false,
        current: 0,
        total: 0,
        message: 'Network error',
      });
    }
  };

  const handleItemClick = useCallback((item: CollectionItem, type: CollectionItemType) => {
    // 如果点击的是同一个项目，则取消高亮；否则高亮新项目
    const isSameItem = highlightedItemId === item.id && highlightedItemType === type;
    setHighlightedItemId(isSameItem ? null : item.id);
    setHighlightedItemType(isSameItem ? null : type);
  }, [highlightedItemId, highlightedItemType]);

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

  // 单个项目获取封面（单曲会从所属专辑同步封面）
  const handleItemFetchCover = useCallback(async (item: CollectionItem, type: CollectionItemType) => {
    try {
      console.log(`[Collection] Fetching cover for: ${item.title}`);
      
      if (type === 'track') {
        // 单曲：找到对应的专辑，获取/同步专辑封面
        const track = item as Track;
        const album = rawAlbums.find(a => 
          a.title.toLowerCase() === track.albumName.toLowerCase() &&
          a.artist.toLowerCase() === track.artist.toLowerCase()
        );
        
        if (album) {
          // 使用专辑的封面
          const res = await fetch('/api/covers/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              albumIds: [album.id],
              force: true
            }),
          });
          const data = await res.json();
          
          if (data.success) {
            const result = data.data.results[0];
            if (result?.status === 'success') {
              console.log(`[Collection] Album cover synced to track: ${result.coverUrl}`);
              setImageRefreshKey(prev => prev + 1);
              fetchAlbums();
              fetchTracks();
              fetchCoverStatus();
            } else {
              alert(`Could not find cover for album "${album.title}"`);
            }
          }
        } else {
          alert(`No matching album found for track "${track.title}"`);
        }
      } else {
        // 专辑：直接获取封面
        const res = await fetch('/api/covers/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            albumIds: [item.id],
            force: true
          }),
        });
        const data = await res.json();

        if (data.success) {
          const result = data.data.results[0];
          if (result?.status === 'success') {
            console.log(`[Collection] Cover fetched successfully: ${result.coverUrl}`);
            setImageRefreshKey(prev => prev + 1);
            fetchAlbums();
            fetchTracks();
            fetchCoverStatus();
          } else {
            console.log(`[Collection] Cover fetch failed: ${result?.message || 'Unknown error'}`);
            alert(`Could not find cover for "${item.title}"`);
          }
        } else {
          console.error('[Collection] Cover fetch API error:', data.error);
          alert('Failed to fetch cover');
        }
      }
    } catch (error) {
      console.error('[Collection] Failed to fetch cover:', error);
      alert('Network error while fetching cover');
    }
  }, [fetchAlbums, fetchTracks, fetchCoverStatus, rawAlbums]);

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
  if (status === 'loading' && !isDevAutoLogin) {
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
      <nav className="fixed top-4 left-0 right-0 z-50 flex justify-center">
        <div className="flex items-center gap-2 px-4 py-2 nav-capsule">
          <Link href="/" className="nav-item">Home</Link>
          <Link href="/collection" className="nav-item active">Collection</Link>
          <div className="w-px h-6 bg-border-color mx-1" />
          <ThemeToggle />
          <div className="w-px h-6 bg-border-color mx-1" />
          {/* 用户信息和退出按钮 */}
          {session?.user ? (
            <div className="flex items-center gap-2">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-7 h-7 rounded-full border border-border-color"
                />
              )}
              <span className="text-sm text-foreground-secondary hidden sm:inline">
                {session.user.name || session.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="p-1.5 rounded-md hover:bg-background-tertiary text-foreground-muted hover:text-foreground-primary transition-colors"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : isDevAutoLogin ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
              <Code size={12} />
              <span>Dev Mode</span>
            </div>
          ) : null}
        </div>
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
            {/* 获取缺失封面按钮 - 当有需要时显示 */}
            {coverStatus && coverStatus.withoutCover > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBatchFetchCovers(false)}
                disabled={batchProgress.isRunning}
                className="flex items-center gap-1"
                title={`获取 ${coverStatus.withoutCover} 个缺失封面的专辑（对应单曲会自动同步）`}
              >
                {batchProgress.isRunning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ImageIcon size={14} />
                )}
                Get {coverStatus.withoutCover} Album Covers
              </Button>
            )}
            {/* 修复缺失流派按钮 - 当有需要时显示 */}
            {genreStatus && (genreStatus.albums.missing > 0 || genreStatus.tracks.missing > 0) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleFixMissingGenres}
                disabled={genreFixProgress.isRunning}
                className="flex items-center gap-1"
                title={`修复 ${genreStatus.albums.missing + genreStatus.tracks.missing} 个缺失流派的记录`}
              >
                {genreFixProgress.isRunning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Disc3 size={14} />
                )}
                Fix {genreStatus.albums.missing + genreStatus.tracks.missing} Genres
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsImportOpen(true)} title="Import Collection">
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
              onNodeClick={handleNodeClick}
              highlightedItemId={highlightedItemId}
              highlightedItemType={highlightedItemType}
              onReloadCovers={() => {
                if (confirm('确定要重新获取所有封面吗？这将覆盖已有的封面。')) {
                  handleBatchFetchCovers(true);
                }
              }}
              isReloading={batchProgress.isRunning}
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

      <UnifiedImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onPlaylistImport={handlePlaylistImport}
        onCsvImport={handleImport}
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

      {/* Genre Fix Progress Modal */}
      {showGenreFixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-background-secondary rounded-2xl p-6 w-96 border border-border-color shadow-xl"
          >
            <h3 className="text-lg font-semibold mb-4">Fixing Genres</h3>
            
            {genreFixProgress.isRunning ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 size={24} className="animate-spin text-accent" />
                  <span>{genreFixProgress.message}</span>
                </div>
                <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-300"
                    style={{ 
                      width: `${genreFixProgress.total > 0 ? (genreFixProgress.current / genreFixProgress.total) * 100 : 0}%` 
                    }}
                  />
                </div>
                <p className="text-sm text-foreground-muted text-center">
                  {genreFixProgress.current} / {genreFixProgress.total}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-500">
                  <RefreshCw size={20} />
                  <span>{genreFixProgress.message}</span>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => setShowGenreFixModal(false)}
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
