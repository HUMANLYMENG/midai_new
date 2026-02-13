# Spotify Web API Agent Skill

A comprehensive Python client for the Spotify Web API with support for all available endpoints.

## 📋 Overview

This Agent Skill provides complete access to the Spotify Web API, including:
- **Albums** - Get album information and tracks
- **Artists** - Get artist details and discography
- **Tracks** - Get track information
- **Playlists** - Create, manage, and modify playlists
- **Users** - Access user profiles and top items
- **Library** - Manage user's saved content
- **Player** - Control playback, queue, and devices
- **Search** - Search across all content types
- **Shows & Episodes** - Podcast content
- **Audiobooks & Chapters** - Audiobook content

## 🔑 Authentication

The skill supports multiple authentication flows:

### 1. Client Credentials Flow (Public Data Only)
```python
from spotify_web_api_skill import SpotifyAPI

spotify = SpotifyAPI(
    client_id="your_client_id",
    client_secret="your_client_secret"
)

# Get album info
album = spotify.get_album("4aawyAB9vmqN3uQ7FjRGTy")
```

### 2. Authorization Code Flow (User Data)
```python
spotify = SpotifyAPI(access_token="user_access_token")

# Get current user's playlists
playlists = spotify.get_current_user_playlists()
```

### 3. With Auto-Refresh
```python
spotify = SpotifyAPI(
    client_id="your_client_id",
    client_secret="your_client_secret",
    refresh_token="user_refresh_token",
    auto_refresh=True
)
```

## 📚 Available Methods

### Albums
- `get_album(album_id, market=None)` - Get album details
- `get_album_tracks(album_id, market=None, limit=20, offset=0)` - Get album tracks

### Artists
- `get_artist(artist_id)` - Get artist details
- `get_artist_albums(artist_id, include_groups=None, market=None, limit=20, offset=0)` - Get artist's albums

### Tracks
- `get_track(track_id, market=None)` - Get track details

### Playlists
- `get_playlist(playlist_id, market=None, fields=None)` - Get playlist details
- `get_playlist_items(playlist_id, market=None, fields=None, limit=20, offset=0)` - Get playlist items
- `add_items_to_playlist(playlist_id, uris, position=None)` - Add items to playlist
- `remove_playlist_items(playlist_id, tracks)` - Remove items from playlist
- `update_playlist_items(playlist_id, uris, range_start=None, range_length=None, insert_before=None)` - Reorder/replace items
- `change_playlist_details(playlist_id, name=None, public=None, collaborative=None, description=None)` - Update playlist
- `get_playlist_cover_image(playlist_id)` - Get cover image
- `upload_custom_playlist_cover(playlist_id, image_data)` - Upload custom cover
- `create_playlist(name, public=True, collaborative=False, description=None)` - Create new playlist
- `get_current_user_playlists(limit=20, offset=0)` - Get user's playlists

### Users
- `get_current_user_profile()` - Get current user profile
- `get_user_top_items(item_type, time_range="medium_term", limit=20, offset=0)` - Get user's top artists/tracks

### Library
- `get_saved_albums(limit=20, offset=0, market=None)` - Get saved albums
- `get_saved_tracks(limit=20, offset=0, market=None)` - Get saved tracks
- `get_saved_shows(limit=20, offset=0)` - Get saved shows
- `get_saved_episodes(limit=20, offset=0, market=None)` - Get saved episodes
- `get_saved_audiobooks(limit=20, offset=0)` - Get saved audiobooks
- `save_to_library(uris)` - Save items to library
- `remove_from_library(uris)` - Remove items from library
- `check_saved_items(uris)` - Check if items are saved
- `get_followed_artists(limit=20, after=None)` - Get followed artists

### Player
- `get_playback_state(market=None)` - Get current playback
- `get_available_devices()` - Get available devices
- `get_currently_playing(market=None)` - Get currently playing track
- `get_recently_played(limit=20, after=None, before=None)` - Get recently played
- `get_queue()` - Get playback queue
- `add_to_queue(uri, device_id=None)` - Add item to queue
- `start_playback(device_id=None, context_uri=None, uris=None, offset=None, position_ms=None)` - Start/resume playback
- `pause_playback(device_id=None)` - Pause playback
- `skip_to_next(device_id=None)` - Skip to next
- `skip_to_previous(device_id=None)` - Skip to previous
- `seek_to_position(position_ms, device_id=None)` - Seek to position
- `set_repeat(state, device_id=None)` - Set repeat mode
- `set_volume(volume_percent, device_id=None)` - Set volume
- `toggle_shuffle(state, device_id=None)` - Toggle shuffle
- `transfer_playback(device_ids, play=None)` - Transfer playback

### Search
- `search(q, search_types, market=None, limit=20, offset=0)` - Search content

### Shows (Podcasts)
- `get_show(show_id, market=None)` - Get show details
- `get_show_episodes(show_id, market=None, limit=20, offset=0)` - Get show episodes

### Episodes
- `get_episode(episode_id, market=None)` - Get episode details

### Audiobooks
- `get_audiobook(audiobook_id, market=None)` - Get audiobook details
- `get_audiobook_chapters(audiobook_id, market=None, limit=20, offset=0)` - Get chapters

### Chapters
- `get_chapter(chapter_id, market=None)` - Get chapter details

## ⚠️ Important API Changes

### Removed Endpoints (November 2024)
- Related Artists
- Recommendations
- Audio Features
- Audio Analysis
- Get Featured Playlists
- Get Category's Playlists
- 30-second preview URLs

### Removed Endpoints (February 2026)
- Get Artist's Top Tracks
- Get Available Markets
- Get New Releases
- Get Several Albums/Artists/Tracks/etc. (batch requests)
- Get User's Playlists (by user ID)
- Get User's Profile (by user ID)
- Create Playlist for user (by user ID)

### Consolidated Endpoints (February 2026)
Library operations consolidated to:
- `PUT /me/library` (Save to Library)
- `DELETE /me/library` (Remove from Library)
- `GET /me/library/contains` (Check User's Saved Items)

### Updated Endpoints
Playlist items endpoints changed from `/tracks` to `/items`:
- `GET /playlists/{id}/items`
- `POST /playlists/{id}/items`
- `DELETE /playlists/{id}/items`
- `PUT /playlists/{id}/items`

## 🔍 Search Examples

```python
# Search for tracks
results = spotify.search("artist:radiohead track:creep", [SearchType.TRACK], limit=5)

# Search for albums
results = spotify.search("album:ok computer", [SearchType.ALBUM], limit=10)

# Search multiple types
results = spotify.search("query", [SearchType.TRACK, SearchType.ARTIST], limit=20)
```

## 🎵 Player Control Examples

```python
# Start playback
spotify.start_playback(context_uri="spotify:album:4aawyAB9vmqN3uQ7FjRGTy")

# Start playback with specific tracks
spotify.start_playback(
    uris=["spotify:track:4iV5W9uYEdYUVa79Axb7Rh"],
    offset={"position": 0}
)

# Control playback
spotify.pause_playback()
spotify.skip_to_next()
spotify.set_volume(75)
spotify.set_repeat(RepeatState.TRACK)
spotify.toggle_shuffle(True)
```

## 📦 Library Management Examples

```python
# Save items
spotify.save_to_library(["spotify:track:4iV5W9uYEdYUVa79Axb7Rh"])

# Check if saved
is_saved = spotify.check_saved_items(["spotify:track:4iV5W9uYEdYUVa79Axb7Rh"])

# Remove items
spotify.remove_from_library(["spotify:track:4iV5W9uYEdYUVa79Axb7Rh"])
```

## 📝 Playlist Management Examples

```python
# Create playlist
playlist = spotify.create_playlist(
    name="My Awesome Playlist",
    description="Created with Spotify API"
)

# Add tracks
spotify.add_items_to_playlist(
    playlist['id'],
    ["spotify:track:4iV5W9uYEdYUVa79Axb7Rh"]
)

# Reorder tracks
spotify.update_playlist_items(
    playlist['id'],
    range_start=0,
    range_length=2,
    insert_before=5
)
```

## ⚡ Error Handling

The skill provides custom exceptions:

```python
from spotify_web_api_skill import (
    SpotifyAPI,
    SpotifyAuthError,
    SpotifyForbiddenError,
    SpotifyRateLimitError,
    SpotifyNotFoundError
)

try:
    album = spotify.get_album("invalid_id")
except SpotifyAuthError as e:
    print(f"Authentication failed: {e}")
except SpotifyNotFoundError as e:
    print(f"Resource not found: {e}")
except SpotifyRateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after} seconds")
except SpotifyError as e:
    print(f"API error: {e}")
```

## 📊 Rate Limiting

Spotify implements rate limiting. When exceeded:
- HTTP 429 status code is returned
- `Retry-After` header indicates wait time
- `SpotifyRateLimitError` exception is raised with `retry_after` attribute

## 🔗 Useful Links

- [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [Web API Reference](https://developer.spotify.com/documentation/web-api/reference)

## 📄 License

This skill is provided as-is for educational and development purposes.
Please comply with Spotify's Developer Terms of Service.
