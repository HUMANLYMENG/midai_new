export interface Album {
  id: number;
  title: string;
  artist: string;
  releaseDate?: string;
  genre?: string;
  length?: string;
  label?: string;
  tag?: string;
  comment?: string;
  coverUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlbumInput {
  title: string;
  artist: string;
  releaseDate?: string;
  genre?: string;
  length?: string;
  label?: string;
  tag?: string;
  comment?: string;
  coverUrl?: string;
}

export interface GraphNode {
  id: string;
  type: 'album' | 'track' | 'genre';
  albumId?: number;
  trackId?: number;
  title?: string;  // 专辑/单曲名称
  artist?: string;
  genre?: string[];
  coverUrl?: string;
  color?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  r?: number;
  albumName?: string; // 单曲所属的专辑名
  releaseDate?: string; // 发行日期
  label?: string; // 厂牌
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

export type SortOption = 'default' | 'alphabet' | 'genre' | 'artist' | 'label' | 'album';

// 单曲类型
export interface Track {
  id: number;
  title: string;
  artist: string;
  albumName: string;  // 单曲所属的专辑名
  releaseDate?: string;
  genre?: string;
  length?: string;
  label?: string;
  tag?: string;
  comment?: string;
  coverUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrackInput {
  title: string;
  artist: string;
  albumName: string;
  releaseDate?: string;
  genre?: string;
  length?: string;
  label?: string;
  tag?: string;
  comment?: string;
  coverUrl?: string;
}

// 收藏类型：专辑或单曲
export type CollectionItem = Album | Track;
export type CollectionItemType = 'album' | 'track';
