'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Album, AlbumInput, SortOption } from '@/types';
import { AlbumList } from '@/components/album/AlbumList';
import { AlbumForm } from '@/components/album/AlbumForm';
import { ImportModal } from '@/components/album/ImportModal';
import { ForceGraph } from '@/components/graph/ForceGraph';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Plus, Upload, Menu, X, Disc3, ImageIcon, Loader2, RefreshCw } from 'lucide-react';
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
  const [albums, setAlbums] = useState<Album[]>([]);
  const [sort, setSort] = useState<SortOption>('default');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [highlightedAlbumId, setHighlightedAlbumId] = useState<number | null>(null);
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

  const fetchAlbums = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/albums?sort=${sort}`);
      const data = await res.json();
      if (data.success) setAlbums(data.data);
    } catch (error) {
      console.error('Failed to fetch albums:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sort]);

  const fetchCoverStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/covers/batch');
      const data = await res.json();
      if (data.success) setCoverStatus(data.data);
    } catch (error) {
      console.error('Failed to fetch cover status:', error);
    }
  }, []);

  useEffect(() => {
    fetchAlbums();
    fetchCoverStatus();
  }, [fetchAlbums, fetchCoverStatus]);

  const handleSubmit = async (formData: AlbumInput) => {
    try {
      if (selectedAlbum) {
        await fetch(`/api/albums/${selectedAlbum.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch('/api/albums', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      fetchAlbums();
      fetchCoverStatus();
    } catch (error) {
      console.error('Failed to save album:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedAlbum) return;
    try {
      await fetch(`/api/albums/${selectedAlbum.id}`, { method: 'DELETE' });
      fetchAlbums();
      fetchCoverStatus();
      setIsFormOpen(false);
      setSelectedAlbum(null);
      setHighlightedAlbumId(null);
    } catch (error) {
      console.error('Failed to delete album:', error);
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
    setBatchProgress({
      isRunning: true,
      current: 0,
      total: coverStatus?.withoutCover || 0,
      message: 'Fetching covers...',
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
        fetchAlbums();
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

  const handleAlbumClick = useCallback((album: Album) => {
    setHighlightedAlbumId(album.id);
  }, []);

  const handleAlbumEdit = useCallback((album: Album) => {
    setSelectedAlbum(album);
    setHighlightedAlbumId(album.id);
    setIsFormOpen(true);
  }, []);

  const handleAlbumDelete = useCallback(async (album: Album) => {
    try {
      await fetch(`/api/albums/${album.id}`, { method: 'DELETE' });
      fetchAlbums();
      fetchCoverStatus();
      if (selectedAlbum?.id === album.id) {
        setSelectedAlbum(null);
        setIsFormOpen(false);
      }
      if (highlightedAlbumId === album.id) {
        setHighlightedAlbumId(null);
      }
    } catch (error) {
      console.error('Failed to delete album:', error);
    }
  }, [fetchAlbums, fetchCoverStatus, selectedAlbum, highlightedAlbumId]);

  const handleNodeClick = useCallback((album: Album) => {
    setSelectedAlbum(album);
    setHighlightedAlbumId(album.id);
    setIsFormOpen(true);
  }, []);

  const handleAddNew = () => {
    setSelectedAlbum(null);
    setHighlightedAlbumId(null);
    setIsFormOpen(true);
  };

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
      <main className="flex-1 flex overflow-hidden pt-20 px-4 pb-4">
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
              <AlbumList
                albums={albums}
                sort={sort}
                onSortChange={setSort}
                onAlbumClick={handleAlbumClick}
                onAlbumEdit={handleAlbumEdit}
                onAlbumDelete={handleAlbumDelete}
                selectedAlbumId={highlightedAlbumId}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Graph Area - 填满剩余空间 */}
        <div className="flex-1 h-full relative min-w-0">
          {/* Toolbar */}
          <div className="absolute top-0 right-0 z-10 flex items-center gap-2">
            {/* 批量获取封面按钮 */}
            {coverStatus && coverStatus.withoutCover > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBatchFetchCovers(false)}
                disabled={batchProgress.isRunning}
                className="flex items-center gap-1"
              >
                {batchProgress.isRunning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ImageIcon size={14} />
                )}
                Get {coverStatus.withoutCover} Covers
              </Button>
            )}
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
              albums={albums}
              onNodeClick={handleNodeClick}
              highlightedAlbumId={highlightedAlbumId}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <AlbumForm
        album={selectedAlbum}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedAlbum(null);
        }}
        onSubmit={handleSubmit}
        onDelete={selectedAlbum ? handleDelete : undefined}
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
