'use client';

import { useState, useEffect } from 'react';
import { Album, AlbumInput } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DraggableModal } from '@/components/ui/DraggableModal';
import { Disc3, Trash2, ImageIcon, Loader2 } from 'lucide-react';

interface AlbumFormProps {
  album?: Album | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AlbumInput) => void;
  onDelete?: () => void;
}

export function AlbumForm({ album, isOpen, onClose, onSubmit, onDelete }: AlbumFormProps) {
  const [formData, setFormData] = useState<AlbumInput>({
    title: '',
    artist: '',
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
    if (album) {
      setFormData({
        title: album.title,
        artist: album.artist,
        releaseDate: album.releaseDate || '',
        genre: album.genre || '',
        length: album.length || '',
        label: album.label || '',
        tag: album.tag || '',
        comment: album.comment || '',
        coverUrl: album.coverUrl || '',
      });
    } else {
      setFormData({
        title: '',
        artist: '',
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
  }, [album, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const handleChange = (field: keyof AlbumInput, value: string) => {
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
        ...(formData.title && { album: formData.title }),
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

  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={onClose}
      title={album ? 'Edit Album' : 'Add New Album'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cover Preview */}
        <div className="flex justify-center mb-5">
          <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-background-tertiary shadow-lg">
            {formData.coverUrl ? (
              <img src={formData.coverUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Disc3 size={40} className="text-foreground-muted" />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input 
            label="Title *" 
            value={formData.title} 
            onChange={e => handleChange('title', e.target.value)} 
            required 
          />
          <Input 
            label="Artist *" 
            value={formData.artist} 
            onChange={e => handleChange('artist', e.target.value)} 
            required 
          />
        </div>

        {/* Cover URL with Fetch Button */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input 
                label="Cover URL" 
                value={formData.coverUrl} 
                onChange={e => handleChange('coverUrl', e.target.value)} 
                placeholder="https://..."
              />
            </div>
            <div className="pt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={fetchCover}
                disabled={isLoadingCover || !formData.artist}
                className="whitespace-nowrap"
              >
                {isLoadingCover ? (
                  <Loader2 size={16} className="animate-spin mr-1" />
                ) : (
                  <ImageIcon size={16} className="mr-1" />
                )}
                {isLoadingCover ? 'Fetching...' : 'Get Cover'}
              </Button>
            </div>
          </div>
          {coverError && (
            <p className="text-xs text-red-500">{coverError}</p>
          )}
          <p className="text-xs text-foreground-muted">
            Click "Get Cover" to auto-fetch from Spotify based on Artist and Title
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input 
            label="Genre" 
            value={formData.genre} 
            onChange={e => handleChange('genre', e.target.value)} 
            placeholder="Rock, Alternative" 
          />
          <Input 
            label="Release Date" 
            value={formData.releaseDate} 
            onChange={e => handleChange('releaseDate', e.target.value)} 
            placeholder="2024" 
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input 
            label="Length" 
            value={formData.length} 
            onChange={e => handleChange('length', e.target.value)} 
            placeholder="42:00" 
          />
          <Input 
            label="Label" 
            value={formData.label} 
            onChange={e => handleChange('label', e.target.value)} 
          />
        </div>

        <Input 
          label="Tags" 
          value={formData.tag} 
          onChange={e => handleChange('tag', e.target.value)} 
          placeholder="favorite, vinyl" 
        />
        <Input 
          label="Comment" 
          value={formData.comment} 
          onChange={e => handleChange('comment', e.target.value)} 
        />

        <div className="flex gap-3 pt-4">
          {album && onDelete && (
            <Button type="button" variant="danger" onClick={onDelete} className="flex items-center gap-2">
              <Trash2 size={16} />
              Delete
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose} className="ml-auto">
            Cancel
          </Button>
          <Button type="submit">
            {album ? 'Save' : 'Add'}
          </Button>
        </div>
      </form>
    </DraggableModal>
  );
}
