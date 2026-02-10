'use client';

import { useState, useEffect } from 'react';
import { Album, AlbumInput, Track, TrackInput, CollectionItemType } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DraggableModal } from '@/components/ui/DraggableModal';
import { Disc3, Music, Trash2, ImageIcon, Loader2 } from 'lucide-react';

interface CollectionFormProps {
  item?: Album | Track | null;
  itemType?: CollectionItemType;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AlbumInput | TrackInput, type: CollectionItemType) => void;
  onDelete?: () => void;
}

export function CollectionForm({
  item,
  itemType = 'album',
  isOpen,
  onClose,
  onSubmit,
  onDelete,
}: CollectionFormProps) {
  const [type, setType] = useState<CollectionItemType>(itemType);
  const [formData, setFormData] = useState<AlbumInput & { albumName?: string }>({
    title: '',
    artist: '',
    albumName: '',
    releaseDate: '',
    genre: '',
    length: '',
    label: '',
    tag: '',
    comment: '',
    coverUrl: '',
  });
  const [isLoadingCover, setIsLoadingCover] = useState(false);
  const [coverError, setCoverError] = useState('');

  useEffect(() => {
    if (item) {
      // 判断是专辑还是单曲
      if ('albumName' in item) {
        setType('track');
        setFormData({
          title: item.title,
          artist: item.artist,
          albumName: item.albumName,
          releaseDate: item.releaseDate || '',
          genre: item.genre || '',
          length: item.length || '',
          label: item.label || '',
          tag: item.tag || '',
          comment: item.comment || '',
          coverUrl: item.coverUrl || '',
        });
      } else {
        setType('album');
        setFormData({
          title: item.title,
          artist: item.artist,
          albumName: '',
          releaseDate: item.releaseDate || '',
          genre: item.genre || '',
          length: item.length || '',
          label: item.label || '',
          tag: item.tag || '',
          comment: item.comment || '',
          coverUrl: item.coverUrl || '',
        });
      }
    } else {
      setType(itemType);
      setFormData({
        title: '',
        artist: '',
        albumName: '',
        releaseDate: '',
        genre: '',
        length: '',
        label: '',
        tag: '',
        comment: '',
        coverUrl: '',
      });
    }
    setCoverError('');
  }, [item, isOpen, itemType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (type === 'track') {
      const trackData: TrackInput = {
        title: formData.title,
        artist: formData.artist,
        albumName: formData.albumName || '',
        releaseDate: formData.releaseDate || undefined,
        genre: formData.genre || undefined,
        length: formData.length || undefined,
        label: formData.label || undefined,
        tag: formData.tag || undefined,
        comment: formData.comment || undefined,
        coverUrl: formData.coverUrl || undefined,
      };
      onSubmit(trackData, 'track');
    } else {
      const albumData: AlbumInput = {
        title: formData.title,
        artist: formData.artist,
        releaseDate: formData.releaseDate || undefined,
        genre: formData.genre || undefined,
        length: formData.length || undefined,
        label: formData.label || undefined,
        tag: formData.tag || undefined,
        comment: formData.comment || undefined,
        coverUrl: formData.coverUrl || undefined,
      };
      onSubmit(albumData, 'album');
    }
    onClose();
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const fetchCover = async () => {
    if (!formData.artist.trim()) {
      setCoverError('Please enter artist name first');
      return;
    }

    setIsLoadingCover(true);
    setCoverError('');

    try {
      const params = new URLSearchParams({
        artist: formData.artist,
        ...(formData.title && { album: type === 'album' ? formData.title : formData.albumName }),
        size: 'large',
      });

      const response = await fetch(`/api/cover?${params.toString()}`);
      const result = await response.json();

      if (result.success && result.data.coverUrl) {
        setFormData(prev => ({ ...prev, coverUrl: result.data.coverUrl }));
      } else {
        setCoverError('Cover not found');
      }
    } catch (error) {
      setCoverError('Failed to fetch cover');
    } finally {
      setIsLoadingCover(false);
    }
  };

  const isEditing = !!item;
  const title = isEditing
    ? type === 'album'
      ? 'Edit Album'
      : 'Edit Track'
    : type === 'album'
      ? 'Add Album'
      : 'Add Track';

  return (
    <DraggableModal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 类型选择（仅新增时显示） */}
        {!isEditing && (
          <div className="flex gap-2 p-1 bg-secondary/50 rounded-lg">
            <button
              type="button"
              onClick={() => setType('album')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                type === 'album'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Disc3 className="w-4 h-4" />
              Album
            </button>
            <button
              type="button"
              onClick={() => setType('track')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                type === 'track'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Music className="w-4 h-4" />
              Track
            </button>
          </div>
        )}

        {/* 标题 */}
        <Input
          label={type === 'album' ? "Album Title" : "Track Title"}
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          required
          placeholder={type === 'album' ? "Enter album title" : "Enter track title"}
        />

        {/* 艺术家 */}
        <Input
          label="Artist"
          value={formData.artist}
          onChange={(e) => handleChange('artist', e.target.value)}
          required
          placeholder="Enter artist name"
        />

        {/* 专辑名（仅单曲） */}
        {type === 'track' && (
          <Input
            label="Album Name"
            value={formData.albumName}
            onChange={(e) => handleChange('albumName', e.target.value)}
            required
            placeholder="Enter album this track belongs to"
          />
        )}

        {/* 流派 */}
        <Input
          label="Genre"
          value={formData.genre}
          onChange={(e) => handleChange('genre', e.target.value)}
          placeholder="e.g., Rock, Jazz, Pop"
        />

        {/* 发行日期 */}
        <Input
          label="Release Date"
          type="date"
          value={formData.releaseDate}
          onChange={(e) => handleChange('releaseDate', e.target.value)}
        />

        {/* 时长 */}
        <Input
          label="Length"
          value={formData.length}
          onChange={(e) => handleChange('length', e.target.value)}
          placeholder="e.g., 42:30"
        />

        {/* 唱片公司 */}
        <Input
          label="Label"
          value={formData.label}
          onChange={(e) => handleChange('label', e.target.value)}
          placeholder="Record label"
        />

        {/* 标签 */}
        <Input
          label="Tag"
          value={formData.tag}
          onChange={(e) => handleChange('tag', e.target.value)}
          placeholder="Custom tag"
        />

        {/* 备注 */}
        <Input
          label="Comment"
          value={formData.comment}
          onChange={(e) => handleChange('comment', e.target.value)}
          placeholder="Notes about this item"
        />

        {/* 封面 URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Cover URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={formData.coverUrl}
              onChange={(e) => handleChange('coverUrl', e.target.value)}
              placeholder="https://..."
              className="flex-1 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={fetchCover}
              disabled={isLoadingCover}
              className="shrink-0"
            >
              {isLoadingCover ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
              Get Cover
            </Button>
          </div>
          {coverError && (
            <p className="text-xs text-destructive">{coverError}</p>
          )}
          {formData.coverUrl && (
            <div className="mt-2">
              <img
                src={formData.coverUrl}
                alt="Cover preview"
                className="w-20 h-20 object-cover rounded-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                }}
              />
            </div>
          )}
        </div>

        {/* 按钮 */}
        <div className="flex gap-2 pt-4">
          {isEditing && onDelete && (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (confirm('Are you sure you want to delete this item?')) {
                  onDelete();
                  onClose();
                }
              }}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {isEditing ? 'Save Changes' : `Add ${type === 'album' ? 'Album' : 'Track'}`}
          </Button>
        </div>
      </form>
    </DraggableModal>
  );
}
