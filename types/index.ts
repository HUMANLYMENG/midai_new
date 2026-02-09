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
  type: 'album' | 'genre';
  albumId?: number;
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
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

export type SortOption = 'default' | 'alphabet' | 'genre' | 'artist' | 'label';
