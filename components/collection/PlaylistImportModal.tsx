'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Disc3, Music, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import type { SongInfo } from '@/lib/music-link-parser';

interface PlaylistImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (url: string) => Promise<{ 
    success: boolean; 
    imported: number; 
    skipped: number; 
    errors: string[];
    playlistName?: string;
    songs?: SongInfo[];
  }>;
}

export function PlaylistImportModal({ isOpen, onClose, onImport }: PlaylistImportModalProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'preview' | 'result'>('input');
  const [previewData, setPreviewData] = useState<{
    playlistName: string;
    platform: string;
    songCount: number;
    songs: SongInfo[];
  } | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const handleParse = async () => {
    if (!url.trim()) return;
    
    setIsLoading(true);
    try {
      // 先解析预览
      const response = await fetch('/api/playlist/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPreviewData({
          playlistName: data.data.name,
          platform: data.platform,
          songCount: data.data.songCount,
          songs: data.data.songs.slice(0, 20), // 预览前20首
        });
        setStep('preview');
      } else {
        alert(data.error || 'Failed to parse playlist');
      }
    } catch (error) {
      console.error('Parse failed:', error);
      alert('Failed to parse playlist URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    setIsLoading(true);
    try {
      const res = await onImport(url);
      setResult(res);
      setStep('result');
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setStep('input');
    setPreviewData(null);
    setResult(null);
    onClose();
  };

  const detectPlatform = (url: string): string => {
    const lower = url.toLowerCase();
    if (lower.includes('y.qq.com') || lower.includes('qq.com')) return 'QQ音乐';
    if (lower.includes('163cn.tv') || lower.includes('163.com') || lower.includes('music.163')) return '网易云音乐';
    return '未知平台';
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Playlist">
      <div className="space-y-4">
        {step === 'input' && (
          <>
            <div className="space-y-3">
              <label className="text-sm text-foreground-secondary">
                Paste playlist URL from QQ Music or NetEase Cloud Music
              </label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://c6.y.qq.com/... or https://163cn.tv/..."
                className="w-full"
              />
              
              {/* 示例链接 */}
              <div className="text-xs text-foreground-muted space-y-1">
                <p>Supported formats:</p>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  <li>QQ Music playlist links</li>
                  <li>NetEase Cloud Music playlist links</li>
                </ul>
              </div>
            </div>

            <Button
              onClick={handleParse}
              isLoading={isLoading}
              disabled={!url.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Parsing...
                </>
              ) : (
                <>
                  <ExternalLink size={16} className="mr-2" />
                  Parse Playlist
                </>
              )}
            </Button>
          </>
        )}

        {step === 'preview' && previewData && (
          <>
            {/* 歌单信息 */}
            <div className="p-4 bg-background-tertiary/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Disc3 size={20} className="text-accent" />
                <span className="font-medium">{previewData.playlistName}</span>
              </div>
              <div className="text-sm text-foreground-secondary space-y-1">
                <p>Platform: {previewData.platform}</p>
                <p>Songs: {previewData.songCount} tracks</p>
                <p className="text-xs text-accent">
                  Genres will be fetched from MusicBrainz during import
                </p>
                <p className="text-xs text-foreground-muted">
                  Previewing first {previewData.songs.length} songs
                </p>
              </div>
            </div>

            {/* 歌曲预览列表 */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {previewData.songs.map((song, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 bg-background-tertiary/30 rounded-lg"
                >
                  <span className="text-xs text-foreground-muted w-6 text-center">
                    {index + 1}
                  </span>
                  <Music size={16} className="text-accent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{song.name}</p>
                    <p className="text-xs text-foreground-secondary truncate">
                      {song.artists.join(', ')} · {song.album}
                    </p>
                  </div>
                  {song.duration && (
                    <span className="text-xs text-foreground-muted">{song.duration}</span>
                  )}
                </div>
              ))}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setStep('input')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                isLoading={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Importing...
                  </>
                ) : (
                  `Import ${previewData.songCount} Songs`
                )}
              </Button>
            </div>
          </>
        )}

        {step === 'result' && result && (
          <div className="space-y-4">
            <div className={`flex items-center gap-3 p-4 rounded-lg ${
              result.success ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}>
              {result.success ? (
                <CheckCircle size={24} className="text-green-500" />
              ) : (
                <AlertCircle size={24} className="text-red-500" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  result.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  {result.success ? 'Import completed!' : 'Import failed'}
                </p>
                <p className="text-xs text-foreground-secondary">
                  {result.imported} imported, {result.skipped} skipped
                </p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-amber-400">Some errors occurred:</p>
                <div className="max-h-32 overflow-y-auto text-xs text-foreground-muted space-y-1 p-2 bg-red-500/5 rounded-lg">
                  {result.errors.map((error, i) => (
                    <p key={i}>{error}</p>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
