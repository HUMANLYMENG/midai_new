/**
 * 专辑歌曲列表抓取工具
 * 使用 MusicBrainz API 获取专辑曲目信息
 */

interface Track {
  position: string;
  title: string;
  duration?: string; // 格式: MM:SS
  durationMs?: number;
}

interface AlbumTracklist {
  artist: string;
  album: string;
  releaseDate?: string;
  tracks: Track[];
  totalTracks: number;
  totalDuration?: string;
  source: string;
  sourceUrl: string;
}

/**
 * 格式化时长 (毫秒 -> MM:SS 或 HH:MM:SS)
 */
function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 搜索 MusicBrainz 专辑
 */
async function searchMusicBrainzRelease(artist: string, album: string): Promise<any | null> {
  const query = `artist:"${artist}" AND release:"${album}"`;
  const searchUrl = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(query)}&fmt=json&limit=5`;

  console.log(`[MusicBrainz] Searching: ${artist} - ${album}`);

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'MidaiApp/1.0 (midai@example.com)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[MusicBrainz] Search failed: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.releases || data.releases.length === 0) {
      console.log(`[MusicBrainz] No releases found`);
      return null;
    }

    // 找到最匹配的发行版本（优先选择专辑类型，而不是单曲/EP）
    const release = data.releases.find((r: any) =>
      r['release-group']?.['primary-type'] === 'Album'
    ) || data.releases[0];

    console.log(`[MusicBrainz] Found release: ${release.title} (${release.id})`);
    return release;
  } catch (error) {
    console.error('[MusicBrainz] Search error:', error);
    return null;
  }
}

/**
 * 获取专辑曲目列表
 */
async function fetchMusicBrainzTracklist(releaseId: string): Promise<Track[]> {
  const url = `https://musicbrainz.org/ws/2/release/${releaseId}?inc=recordings&fmt=json`;

  console.log(`[MusicBrainz] Fetching tracklist: ${releaseId}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MidaiApp/1.0 (midai@example.com)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[MusicBrainz] Tracklist fetch failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const tracks: Track[] = [];

    // 处理多碟专辑
    const media = data.media || [];
    let trackNumber = 1;

    for (const disc of media) {
      const discTracks = disc.tracks || [];

      for (const track of discTracks) {
        const recording = track.recording;
        if (recording) {
          tracks.push({
            position: track.number || String(trackNumber),
            title: recording.title,
            duration: formatDuration(recording.length),
            durationMs: recording.length,
          });
          trackNumber++;
        }
      }
    }

    console.log(`[MusicBrainz] Found ${tracks.length} tracks`);
    return tracks;
  } catch (error) {
    console.error('[MusicBrainz] Tracklist fetch error:', error);
    return [];
  }
}

/**
 * 获取专辑歌曲列表（主函数）
 */
export async function fetchAlbumTracklist(
  artist: string,
  album: string
): Promise<AlbumTracklist | null> {
  if (!artist?.trim() || !album?.trim()) {
    console.error('[fetchAlbumTracklist] Artist and album are required');
    return null;
  }

  console.log(`\n========== Fetching Tracklist ==========`);
  console.log(`Artist: ${artist}`);
  console.log(`Album: ${album}`);
  console.log(`========================================\n`);

  // 1. 搜索 MusicBrainz
  const release = await searchMusicBrainzRelease(artist.trim(), album.trim());

  if (!release) {
    console.error(`[fetchAlbumTracklist] Album not found: ${artist} - ${album}`);
    return null;
  }

  // 2. 获取曲目列表
  const tracks = await fetchMusicBrainzTracklist(release.id);

  if (tracks.length === 0) {
    console.error(`[fetchAlbumTracklist] No tracks found for: ${artist} - ${album}`);
    return null;
  }

  // 3. 计算总时长
  const totalDurationMs = tracks.reduce((sum, t) => sum + (t.durationMs || 0), 0);

  const result: AlbumTracklist = {
    artist: release['artist-credit']?.[0]?.name || artist,
    album: release.title,
    releaseDate: release.date,
    tracks,
    totalTracks: tracks.length,
    totalDuration: totalDurationMs > 0 ? formatDuration(totalDurationMs) : undefined,
    source: 'MusicBrainz',
    sourceUrl: `https://musicbrainz.org/release/${release.id}`,
  };

  return result;
}

/**
 * 打印专辑曲目列表
 */
export function printTracklist(tracklist: AlbumTracklist): void {
  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  🎵 ${tracklist.album.padEnd(48)} ║`);
  console.log(`║  👤 ${tracklist.artist.padEnd(48)} ║`);
  if (tracklist.releaseDate) {
    console.log(`║  📅 ${tracklist.releaseDate.padEnd(48)} ║`);
  }
  console.log(`╠════════════════════════════════════════════════════════════╣`);
  console.log(`║  #   │ Track Title                              │ Duration ║`);
  console.log(`╠══════╪══════════════════════════════════════════╪══════════╣`);

  tracklist.tracks.forEach((track) => {
    const pos = track.position.padStart(2).padEnd(4);
    const title = track.title.length > 38
      ? track.title.substring(0, 35) + '...'
      : track.title.padEnd(38);
    const duration = (track.duration || '--:--').padStart(8);
    console.log(`║  ${pos} │ ${title} │ ${duration} ║`);
  });

  console.log(`╠══════╧══════════════════════════════════════════╧══════════╣`);
  console.log(`║  Total: ${tracklist.totalTracks} tracks${tracklist.totalDuration ? ` │ ${tracklist.totalDuration}` : ''}`.padEnd(56) + '║');
  console.log(`║  Source: ${tracklist.source}`.padEnd(56) + '║');
  console.log(`║  URL: ${tracklist.sourceUrl.substring(0, 48)}`.padEnd(56) + '║');
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);
}

/**
 * 保存曲目列表到 JSON 文件
 */
export function saveTracklistToFile(tracklist: AlbumTracklist, filename?: string): string {
  const defaultFilename = `${tracklist.artist.replace(/[^a-zA-Z0-9]/g, '_')}_${tracklist.album.replace(/[^a-zA-Z0-9]/g, '_')}_tracks.json`;
  const outputPath = filename || `/workspace/group/${defaultFilename}`;

  // 使用动态导入
  import('fs').then(fs => {
    fs.writeFileSync(outputPath, JSON.stringify(tracklist, null, 2), 'utf-8');
    console.log(`[saveTracklistToFile] Saved to: ${outputPath}`);
  });

  return outputPath;
}

// CLI 用法
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npx ts-node scripts/fetch-tracklist.ts "Artist Name" "Album Name"');
    console.log('Example: npx ts-node scripts/fetch-tracklist.ts "Radiohead" "OK Computer"');
    process.exit(1);
  }

  const [artist, album] = args;

  const tracklist = await fetchAlbumTracklist(artist, album);
  if (tracklist) {
    printTracklist(tracklist);
    saveTracklistToFile(tracklist);
  } else {
    console.error('Failed to fetch tracklist');
    process.exit(1);
  }
}

// 检测是否在 CLI 模式下运行
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}
