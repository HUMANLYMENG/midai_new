'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Disc3, Music, Loader2, CheckCircle, AlertCircle, 
  ExternalLink, Upload, FileText, Link2, FileSpreadsheet, GripVertical
} from 'lucide-react';
import type { SongInfo } from '@/lib/music-link-parser';

interface UnifiedImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaylistImport: (url: string, onProgress?: (current: number, total: number) => void) => Promise<{ 
    success: boolean; 
    imported: number; 
    skipped: number; 
    errors: string[];
    playlistName?: string;
  }>;
  onCsvImport: (file: File) => Promise<{ imported: number; skipped: number; errors: string[] }>;
}

type TabType = 'link' | 'csv';

export function UnifiedImportModal({ 
  isOpen, 
  onClose, 
  onPlaylistImport,
  onCsvImport 
}: UnifiedImportModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('link');
  
  const [url, setUrl] = useState('');
  const [linkPreview, setLinkPreview] = useState<{
    playlistName: string;
    platform: string;
    songCount: number;
    songs: SongInfo[];
  } | null>(null);
  const [linkStep, setLinkStep] = useState<'input' | 'preview' | 'importing' | 'result'>('input');
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  
  const [file, setFile] = useState<File | null>(null);
  const [csvResult, setCsvResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [linkResult, setLinkResult] = useState<{ 
    success: boolean; 
    imported: number; 
    skipped: number; 
    skippedSongs?: Array<{ name: string; artist: string; album: string }>;
    totalSongs?: number;
    errors: string[]; 
  } | null>(null);

  // Simple drag implementation
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-drag-handle]')) return;
    
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y,
      });
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Reset position when opening
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const handleParseLink = async () => {
    if (!url.trim()) return;
    setIsParsing(true);
    try {
      const response = await fetch('/api/playlist/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (data.success) {
        setLinkPreview({
          playlistName: data.data.name,
          platform: data.platform,
          songCount: data.data.songCount,
          songs: data.data.songs.slice(0, 20),
        });
        setLinkStep('preview');
      } else {
        alert(data.error || 'Failed to parse playlist');
      }
    } catch (error) {
      alert('Failed to parse playlist URL');
    } finally {
      setIsParsing(false);
    }
  };

  const handleImportLink = async () => {
    if (!linkPreview) return;
    setLinkStep('importing');
    setIsImporting(true);
    setImportProgress({ current: 0, total: linkPreview.songCount });
    
    const onProgress = (current: number, total: number) => {
      setImportProgress({ current, total });
    };
    
    try {
      const res = await onPlaylistImport(url, onProgress);
      setLinkResult(res);
      setLinkStep('result');
    } catch (error) {
      setLinkStep('preview');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setCsvResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      setCsvResult(null);
    }
  };

  const handleImportCsv = async () => {
    if (!file) return;
    setIsImporting(true);
    try {
      const res = await onCsvImport(file);
      setCsvResult(res);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    // 先关闭弹窗
    onClose();
    // 延迟重置状态，避免视觉上看到重置过程
    setTimeout(() => {
      setUrl('');
      setLinkPreview(null);
      setLinkStep('input');
      setLinkResult(null);
      setImportProgress({ current: 0, total: 0 });
      setFile(null);
      setCsvResult(null);
      setActiveTab('link');
      setIsParsing(false);
      setIsImporting(false);
      setPosition({ x: 0, y: 0 });
    }, 300);
  };

  const handleBackToInput = () => {
    setLinkStep('input');
    setLinkPreview(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, x: position.x, y: position.y }}
        transition={{ duration: 0.2 }}
        className="bg-background-secondary rounded-2xl w-[500px] max-h-[80vh] overflow-hidden border border-border-color shadow-xl"
      >
        {/* Header */}
        <div 
          data-drag-handle
          className="flex items-center justify-between px-6 py-4 border-b border-border-color cursor-move select-none"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div className="flex items-center gap-2">
            <GripVertical size={18} className="text-foreground-muted" />
            <h2 className="text-lg font-semibold">Import Collection</h2>
          </div>
          <button onClick={handleClose} className="text-foreground-muted hover:text-foreground-primary transition-colors p-1">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          {/* Tabs */}
          <div className="flex border-b border-border-color">
            <button
              onClick={() => setActiveTab('link')}
              className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${activeTab === 'link' ? 'text-accent' : 'text-foreground-secondary'}`}
            >
              <span className="flex items-center justify-center gap-2">
                <Link2 size={16} />
                From Link
              </span>
              {activeTab === 'link' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
            </button>
            <button
              onClick={() => setActiveTab('csv')}
              className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${activeTab === 'csv' ? 'text-accent' : 'text-foreground-secondary'}`}
            >
              <span className="flex items-center justify-center gap-2">
                <FileSpreadsheet size={16} />
                From CSV
              </span>
              {activeTab === 'csv' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
            </button>
          </div>

          {/* Link Import */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              {linkStep === 'input' && (
                <>
                  <div className="space-y-3">
                    <p className="text-sm text-foreground-secondary">
                      Import from QQ Music or NetEase Cloud Music playlist URL
                    </p>
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://c6.y.qq.com/... or https://163cn.tv/..."
                      className="w-full"
                      disabled={isParsing}
                    />
                    <p className="text-xs text-accent">
                      Genres will be automatically fetched from MusicBrainz
                    </p>
                  </div>

                  <button
                    onClick={handleParseLink}
                    disabled={!url.trim() || isParsing}
                    className="w-full py-2.5 px-4 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Parsing...</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink size={18} />
                        <span>Parse Playlist</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {linkStep === 'preview' && linkPreview && (
                <>
                  <div className="p-4 bg-background-tertiary/50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Disc3 size={20} className="text-accent" />
                      <span className="font-medium">{linkPreview.playlistName}</span>
                    </div>
                    <div className="text-sm text-foreground-secondary space-y-1">
                      <p>Platform: {linkPreview.platform}</p>
                      <p>Songs: {linkPreview.songCount} tracks</p>
                      <p className="text-xs text-accent">Genres from MusicBrainz</p>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {linkPreview.songs.map((song, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-background-tertiary/30 rounded-lg">
                        <span className="text-xs text-foreground-muted w-6 text-center">{index + 1}</span>
                        <Music size={16} className="text-accent flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{song.name}</p>
                          <p className="text-xs text-foreground-secondary truncate">{song.artists.join(', ')} · {song.album}</p>
                        </div>
                        {song.duration && <span className="text-xs text-foreground-muted">{song.duration}</span>}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleBackToInput} className="flex-1">Back</Button>
                    <Button onClick={handleImportLink} className="flex-1">Import {linkPreview.songCount} Songs</Button>
                  </div>
                </>
              )}

              {linkStep === 'importing' && (
                <div className="space-y-6 py-8">
                  <div className="flex justify-center">
                    <Loader2 size={48} className="animate-spin text-accent" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-lg font-medium">
                      {importProgress.current >= importProgress.total && importProgress.total > 0
                        ? 'Finalizing...' 
                        : 'Importing...'
                      }
                    </p>
                    <p className="text-sm text-foreground-secondary">
                      Fetching genres from MusicBrainz
                    </p>
                    {importProgress.current >= importProgress.total && importProgress.total > 0 && (
                      <p className="text-xs text-foreground-muted animate-pulse">
                        Saving to database, please wait...
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent transition-all duration-300"
                        style={{ 
                          width: `${importProgress.total > 0 
                            ? Math.min((importProgress.current / importProgress.total) * 100, 100) 
                            : 0}%` 
                        }}
                      />
                    </div>
                    <p className="text-center text-sm text-foreground-secondary">
                      {importProgress.current >= importProgress.total && importProgress.total > 0
                        ? 'Almost done...'
                        : `${importProgress.current} / ${importProgress.total} songs`
                      }
                    </p>
                  </div>
                </div>
              )}

              {linkStep === 'result' && linkResult && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className={`flex items-center gap-3 p-4 rounded-lg ${linkResult.success ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {linkResult.success ? <CheckCircle size={24} className="text-green-500" /> : <AlertCircle size={24} className="text-red-500" />}
                    <div>
                      <p className={`text-sm font-medium ${linkResult.success ? 'text-green-400' : 'text-red-400'}`}>
                        {linkResult.success ? 'Import completed!' : 'Import failed'}
                      </p>
                      <p className="text-xs text-foreground-secondary">
                        {linkResult.imported} imported, {linkResult.skipped} skipped
                        {linkResult.totalSongs ? ` (total ${linkResult.totalSongs})` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Skipped Songs List */}
                  {linkResult.skippedSongs && linkResult.skippedSongs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-400 font-medium">
                        {linkResult.skipped} duplicate songs skipped:
                      </p>
                      <div className="max-h-40 overflow-y-auto text-xs space-y-1 p-2 bg-amber-500/5 rounded-lg border border-amber-500/20">
                        {linkResult.skippedSongs.map((song, i) => (
                          <div key={i} className="flex items-center gap-2 text-foreground-secondary">
                            <span className="text-foreground-muted w-5">{i + 1}.</span>
                            <span className="truncate flex-1">
                              <span className="text-foreground-primary">{song.name}</span>
                              <span className="text-foreground-muted"> · {song.artist}</span>
                              {song.album && <span className="text-foreground-muted"> · {song.album}</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Errors */}
                  {linkResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-red-400 font-medium">Errors:</p>
                      <div className="max-h-32 overflow-y-auto text-xs text-foreground-muted space-y-1 p-2 bg-red-500/5 rounded-lg">
                        {linkResult.errors.map((error, i) => <p key={i}>{error}</p>)}
                      </div>
                    </div>
                  )}

                  <Button onClick={handleClose} className="w-full">Done</Button>
                </div>
              )}
            </div>
          )}

          {/* CSV Import */}
          {activeTab === 'csv' && (
            <div className="space-y-4">
              {!csvResult ? (
                <>
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${file ? 'border-accent bg-accent/5' : 'border-white/10 hover:border-white/20'}`}
                  >
                    {file ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText size={24} className="text-accent" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-foreground-primary">{file.name}</p>
                          <p className="text-xs text-foreground-secondary">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload size={32} className="mx-auto mb-3 text-foreground-muted" />
                        <p className="text-sm text-foreground-secondary mb-2">Drop your CSV file here, or click to browse</p>
                        <p className="text-xs text-foreground-muted">Supports: title, artist, release_date, genre, length, label, tag, comment, cover</p>
                      </>
                    )}
                    <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" id="csv-input" />
                    {!file && (
                      <label htmlFor="csv-input">
                        <Button type="button" variant="secondary" className="mt-4 cursor-pointer">Select File</Button>
                      </label>
                    )}
                  </div>
                  {file && (
                    <Button onClick={handleImportCsv} isLoading={isImporting} className="w-full">
                      {isImporting ? 'Importing...' : 'Import Albums'}
                    </Button>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg">
                    <CheckCircle size={24} className="text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-green-400">Import completed!</p>
                      <p className="text-xs text-foreground-secondary">{csvResult.imported} imported, {csvResult.skipped} skipped</p>
                    </div>
                  </div>
                  {csvResult.errors.length > 0 && (
                    <div className="max-h-32 overflow-y-auto text-xs text-foreground-muted space-y-1 p-2 bg-red-500/5 rounded-lg">
                      {csvResult.errors.map((error, i) => <p key={i}>{error}</p>)}
                    </div>
                  )}
                  <Button onClick={handleClose} className="w-full">Done</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
