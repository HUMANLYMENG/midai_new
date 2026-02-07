declare module 'album-art' {
  interface AlbumArtOptions {
    album?: string;
    size?: 'small' | 'medium' | 'large';
  }

  type Callback = (error: Error | null, response: string) => void;

  function albumArt(
    artist: string,
    options?: AlbumArtOptions | Callback,
    callback?: Callback
  ): Promise<string>;

  export = albumArt;
}
