/**
 * React Hook: 获取音乐流派信息
 * 
 * 使用方法:
 * const { genres, loading, error, fetchGenres } = useMusicGenres();
 * 
 * useEffect(() => {
 *   fetchGenres('Imagine', 'John Lennon');
 * }, []);
 */

import { useState, useCallback } from 'react';

export interface GenreData {
  track?: string;
  album?: string;
  artists: string[];
  genres: string[];
  source: 'spotify' | 'musicbrainz';
  confidence?: { [genre: string]: number };
}

export interface UseMusicGenresOptions {
  prefer?: 'spotify' | 'musicbrainz';
}

export function useMusicGenres(options: UseMusicGenresOptions = {}) {
  const { prefer = 'spotify' } = options;
  
  const [data, setData] = useState<GenreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGenres = useCallback(async (
    track?: string,
    artist?: string,
    album?: string,
    type: 'track' | 'album' = 'track'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (track) params.set('track', track);
      if (artist) params.set('artist', artist);
      if (album) params.set('album', album);
      params.set('type', type);
      params.set('prefer', prefer);

      const response = await fetch(`/api/genres?${params}`);
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '获取流派失败');
      }

      const result: GenreData = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      console.error('获取流派失败:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [prefer]);

  const fetchGenresPost = useCallback(async (
    track?: string,
    artist?: string,
    album?: string,
    type: 'track' | 'album' = 'track'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/genres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track, artist, album, type, prefer }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '获取流派失败');
      }

      const result: GenreData = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      console.error('获取流派失败:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [prefer]);

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    data,
    genres: data?.genres || [],
    loading,
    error,
    fetchGenres,
    fetchGenresPost,
    clearData,
  };
}

export default useMusicGenres;
