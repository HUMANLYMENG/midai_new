'use client';

/**
 * 音乐流派查找组件示例
 * 
 * 展示如何使用 useMusicGenres hook 和 /api/genres API
 */

import React, { useState } from 'react';
import { useMusicGenres } from '@/lib/hooks/useMusicGenres';

export default function MusicGenreFinder() {
  const [track, setTrack] = useState('');
  const [artist, setArtist] = useState('');
  const [prefer, setPrefer] = useState<'spotify' | 'musicbrainz'>('spotify');
  
  const { data, genres, loading, error, fetchGenres, clearData } = useMusicGenres({ prefer });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!track.trim()) return;
    await fetchGenres(track, artist || undefined);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">🎵 音乐流派查找</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">歌曲名称 *</label>
          <input
            type="text"
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            placeholder="例如: Imagine"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">艺术家 (可选)</label>
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="例如: John Lennon"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">优先使用</label>
          <select
            value={prefer}
            onChange={(e) => setPrefer(e.target.value as 'spotify' | 'musicbrainz')}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="spotify">Spotify API</option>
            <option value="musicbrainz">MusicBrainz API</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !track.trim()}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '查询中...' : '查找流派'}
          </button>
          
          {data && (
            <button
              type="button"
              onClick={clearData}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100"
            >
              清除
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg">
          ❌ {error}
        </div>
      )}

      {data && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">
            {data.track && `🎵 ${data.track}`}
            {data.album && `💿 ${data.album}`}
          </h3>
          
          {data.artists.length > 0 && (
            <p className="text-gray-600 mb-3">
              👤 {data.artists.join(', ')}
            </p>
          )}

          <div className="mb-3">
            <span className="text-sm text-gray-500">流派:</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {genres.length > 0 ? (
                genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {genre}
                  </span>
                ))
              ) : (
                <span className="text-gray-400">未找到流派信息</span>
              )}
            </div>
          </div>

          <div className="text-xs text-gray-400">
            数据来源: {data.source === 'spotify' ? '🟢 Spotify' : '🟠 MusicBrainz'}
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400">
        <p>💡 提示: Spotify API 对流行音乐更准确，MusicBrainz 对冷门音乐更全面</p>
      </div>
    </div>
  );
}
