"""
Spotify Web API Skill
=====================

A comprehensive Python client for the Spotify Web API.

Base URL: https://api.spotify.com/v1

Authentication:
- OAuth 2.0 required for all endpoints
- Client Credentials Flow for public data
- Authorization Code Flow for user data
- PKCE for mobile/SPA applications

Important Changes (November 2024 & February 2026):
=================================================

REMOVED/DEPRECATED ENDPOINTS:
- Related Artists (GET /artists/{id}/related-artists)
- Recommendations (GET /recommendations)
- Audio Features (GET /audio-features/{id}, GET /audio-features)
- Audio Analysis (GET /audio-analysis/{id})
- Get Featured Playlists (GET /browse/featured-playlists)
- Get Category's Playlists (GET /browse/categories/{id}/playlists)
- 30-second preview URLs in multi-get responses
- Get Artist's Top Tracks (REMOVED Feb 2026)
- Get Available Markets (REMOVED Feb 2026)
- Get New Releases (REMOVED Feb 2026)
- Get Several Albums/Artists/Audiobooks/Categories/Chapters/Episodes/Shows/Tracks (REMOVED Feb 2026)
- Create Playlist for user POST /users/{user_id}/playlists (REMOVED - use POST /me/playlists)
- Get User's Playlists GET /users/{id}/playlists (REMOVED)
- Get User's Profile GET /users/{id} (REMOVED)

LIBRARY ENDPOINTS CONSOLIDATED (Feb 2026):
- All save/remove/check endpoints consolidated to:
  - PUT /me/library (Save to Library)
  - DELETE /me/library (Remove from Library)
  - GET /me/library/contains (Check User's Saved Items)
- Replaces individual endpoints for albums, tracks, shows, episodes, audiobooks

PLAYLIST ITEMS ENDPOINTS UPDATED:
- New endpoints (use /items instead of /tracks):
  - GET /playlists/{id}/items
  - POST /playlists/{id}/items
  - DELETE /playlists/{id}/items
  - PUT /playlists/{id}/items

Rate Limiting:
- Spotify implements rate limiting
- 429 status code indicates rate limit exceeded
- Retry-After header indicates seconds to wait

Example Usage:
    from spotify_web_api_skill import SpotifyAPI
    
    # Client Credentials Flow (for public data)
    spotify = SpotifyAPI(client_id="your_client_id", client_secret="your_client_secret")
    album = spotify.get_album("4aawyAB9vmqN3uQ7FjRGTy")
    
    # Authorization Code Flow (for user data)
    spotify = SpotifyAPI(access_token="user_access_token")
    playlists = spotify.get_current_user_playlists()
"""

import base64
import json
import time
from typing import Dict, List, Optional, Union, Any
from dataclasses import dataclass
from enum import Enum
import requests


class SpotifyError(Exception):
    """Base exception for Spotify API errors."""
    
    def __init__(self, message: str, status_code: int = None, response: dict = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response


class SpotifyAuthError(SpotifyError):
    """Exception for authentication errors (401)."""
    pass


class SpotifyForbiddenError(SpotifyError):
    """Exception for forbidden errors (403)."""
    pass


class SpotifyRateLimitError(SpotifyError):
    """Exception for rate limit errors (429)."""
    
    def __init__(self, message: str, retry_after: int = None):
        super().__init__(message, status_code=429)
        self.retry_after = retry_after


class SpotifyNotFoundError(SpotifyError):
    """Exception for not found errors (404)."""
    pass


class SearchType(Enum):
    """Search types for the search endpoint."""
    ALBUM = "album"
    ARTIST = "artist"
    PLAYLIST = "playlist"
    TRACK = "track"
    SHOW = "show"
    EPISODE = "episode"
    AUDIOBOOK = "audiobook"


class RepeatState(Enum):
    """Repeat states for playback."""
    OFF = "off"
    TRACK = "track"
    CONTEXT = "context"


@dataclass
class SpotifyCredentials:
    """Spotify API credentials."""
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[float] = None


class SpotifyAPI:
    """
    Spotify Web API Client
    
    A comprehensive Python client for interacting with the Spotify Web API.
    Supports both Client Credentials Flow and Authorization Code Flow.
    
    Args:
        client_id: Spotify application client ID
        client_secret: Spotify application client secret
        access_token: User access token (for user data endpoints)
        refresh_token: Refresh token for obtaining new access tokens
        auto_refresh: Whether to automatically refresh expired tokens
    
    Example:
        # Client Credentials Flow
        spotify = SpotifyAPI(client_id="your_id", client_secret="your_secret")
        
        # With access token
        spotify = SpotifyAPI(access_token="user_access_token")
    """
    
    BASE_URL = "https://api.spotify.com/v1"
    AUTH_URL = "https://accounts.spotify.com/api/token"
    
    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        access_token: Optional[str] = None,
        refresh_token: Optional[str] = None,
        auto_refresh: bool = True
    ):
        self.credentials = SpotifyCredentials(
            client_id=client_id,
            client_secret=client_secret,
            access_token=access_token,
            refresh_token=refresh_token
        )
        self.auto_refresh = auto_refresh
        self.session = requests.Session()
        
        # Get access token via Client Credentials if credentials provided
        if client_id and client_secret and not access_token:
            self._get_client_credentials_token()
    
    def _get_client_credentials_token(self) -> None:
        """
        Obtain access token using Client Credentials Flow.
        
        This flow is suitable for accessing public data only.
        For user data, use Authorization Code Flow.
        """
        credentials = base64.b64encode(
            f"{self.credentials.client_id}:{self.credentials.client_secret}".encode()
        ).decode()
        
        headers = {
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        data = {"grant_type": "client_credentials"}
        
        response = requests.post(self.AUTH_URL, headers=headers, data=data)
        
        if response.status_code != 200:
            raise SpotifyAuthError(
                f"Failed to obtain access token: {response.text}",
                status_code=response.status_code
            )
        
        token_data = response.json()
        self.credentials.access_token = token_data["access_token"]
        self.credentials.token_expires_at = time.time() + token_data["expires_in"]
    
    def _refresh_access_token(self) -> None:
        """Refresh the access token using the refresh token."""
        if not self.credentials.refresh_token:
            raise SpotifyAuthError("No refresh token available")
        
        credentials = base64.b64encode(
            f"{self.credentials.client_id}:{self.credentials.client_secret}".encode()
        ).decode()
        
        headers = {
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        data = {
            "grant_type": "refresh_token",
            "refresh_token": self.credentials.refresh_token
        }
        
        response = requests.post(self.AUTH_URL, headers=headers, data=data)
        
        if response.status_code != 200:
            raise SpotifyAuthError(
                f"Failed to refresh access token: {response.text}",
                status_code=response.status_code
            )
        
        token_data = response.json()
        self.credentials.access_token = token_data["access_token"]
        self.credentials.token_expires_at = time.time() + token_data["expires_in"]
        
        # Update refresh token if provided
        if "refresh_token" in token_data:
            self.credentials.refresh_token = token_data["refresh_token"]
    
    def _get_headers(self) -> Dict[str, str]:
        """Get request headers with authorization."""
        if not self.credentials.access_token:
            raise SpotifyAuthError("No access token available")
        
        # Check if token needs refresh
        if self.auto_refresh and self.credentials.token_expires_at:
            if time.time() >= self.credentials.token_expires_at - 60:  # Refresh 60s early
                if self.credentials.refresh_token:
                    self._refresh_access_token()
        
        return {
            "Authorization": f"Bearer {self.credentials.access_token}",
            "Content-Type": "application/json"
        }
    
    def _handle_response(self, response: requests.Response) -> Dict[str, Any]:
        """Handle API response and errors."""
        if response.status_code == 200 or response.status_code == 201:
            # Some endpoints return empty body
            if response.text:
                return response.json()
            return {}
        
        elif response.status_code == 204:
            return {}
        
        elif response.status_code == 401:
            raise SpotifyAuthError(
                "Unauthorized: Invalid or expired access token",
                status_code=401,
                response=response.json() if response.text else None
            )
        
        elif response.status_code == 403:
            raise SpotifyForbiddenError(
                "Forbidden: Insufficient permissions",
                status_code=403,
                response=response.json() if response.text else None
            )
        
        elif response.status_code == 404:
            raise SpotifyNotFoundError(
                "Resource not found",
                status_code=404,
                response=response.json() if response.text else None
            )
        
        elif response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 0))
            raise SpotifyRateLimitError(
                f"Rate limit exceeded. Retry after {retry_after} seconds",
                retry_after=retry_after
            )
        
        else:
            raise SpotifyError(
                f"API Error: {response.text}",
                status_code=response.status_code,
                response=response.json() if response.text else None
            )
    
    def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        data: Optional[Dict] = None,
        json_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make an API request."""
        url = f"{self.BASE_URL}{endpoint}"
        headers = self._get_headers()
        
        # Remove Content-Type for GET requests
        if method == "GET":
            headers.pop("Content-Type", None)
        
        response = self.session.request(
            method=method,
            url=url,
            headers=headers,
            params=params,
            data=data,
            json=json_data
        )
        
        return self._handle_response(response)

    # ==================== ALBUMS ====================
    
    def get_album(self, album_id: str, market: Optional[str] = None) -> Dict[str, Any]:
        """
        Get Spotify catalog information for a single album.
        
        Args:
            album_id: The Spotify ID for the album
            market: An ISO 3166-1 alpha-2 country code
        
        Returns:
            Album object
        
        Example:
            album = spotify.get_album("4aawyAB9vmqN3uQ7FjRGTy")
        """
        params = {}
        if market:
            params["market"] = market
        
        return self._make_request("GET", f"/albums/{album_id}", params=params)
    
    def get_album_tracks(
        self,
        album_id: str,
        market: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get Spotify catalog information about an album's tracks.
        
        Args:
            album_id: The Spotify ID for the album
            market: An ISO 3166-1 alpha-2 country code
            limit: The maximum number of items to return (1-50, default 20)
            offset: The index of the first item to return
        
        Returns:
            Paging object containing track objects
        
        Example:
            tracks = spotify.get_album_tracks("4aawyAB9vmqN3uQ7FjRGTy", limit=10)
        """
        params = {"limit": limit, "offset": offset}
        if market:
            params["market"] = market
        
        return self._make_request("GET", f"/albums/{album_id}/tracks", params=params)

    # ==================== ARTISTS ====================
    
    def get_artist(self, artist_id: str) -> Dict[str, Any]:
        """
        Get Spotify catalog information for a single artist.
        
        Args:
            artist_id: The Spotify ID for the artist
        
        Returns:
            Artist object
        
        Example:
            artist = spotify.get_artist("0TnOYISbd1XYRBk9myaseg")
        """
        return self._make_request("GET", f"/artists/{artist_id}")
    
    def get_artist_albums(
        self,
        artist_id: str,
        include_groups: Optional[str] = None,
        market: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get Spotify catalog information about an artist's albums.
        
        Args:
            artist_id: The Spotify ID for the artist
            include_groups: A comma-separated list of keywords to filter results
                          (album, single, appears_on, compilation)
            market: An ISO 3166-1 alpha-2 country code
            limit: The maximum number of items to return (1-50, default 20)
            offset: The index of the first item to return
        
        Returns:
            Paging object containing simplified album objects
        
        Example:
            albums = spotify.get_artist_albums("0TnOYISbd1XYRBk9myaseg", limit=10)
        """
        params = {"limit": limit, "offset": offset}
        if include_groups:
            params["include_groups"] = include_groups
        if market:
            params["market"] = market
        
        return self._make_request("GET", f"/artists/{artist_id}/albums", params=params)

    # ==================== TRACKS ====================
    
    def get_track(self, track_id: str, market: Optional[str] = None) -> Dict[str, Any]:
        """
        Get Spotify catalog information for a single track.
        
        Args:
            track_id: The Spotify ID for the track
            market: An ISO 3166-1 alpha-2 country code
        
        Returns:
            Track object
        
        Example:
            track = spotify.get_track("11dFghVXANMlKmJXsNCbNl")
        """
        params = {}
        if market:
            params["market"] = market
        
        return self._make_request("GET", f"/tracks/{track_id}", params=params)

    # ==================== PLAYLISTS ====================
    
    def get_playlist(
        self,
        playlist_id: str,
        market: Optional[str] = None,
        fields: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get a playlist owned by a Spotify user.
        
        Args:
            playlist_id: The Spotify ID for the playlist
            market: An ISO 3166-1 alpha-2 country code
            fields: Filters for the query (comma-separated list of fields to return)
        
        Returns:
            Playlist object
        
        Example:
            playlist = spotify.get_playlist("3cEYpjA9oz9GiPac4AsH4n")
        """
        params = {}
        if market:
            params["market"] = market
        if fields:
            params["fields"] = fields
        
        return self._make_request("GET", f"/playlists/{playlist_id}", params=params)
    
    def get_playlist_items(
        self,
        playlist_id: str,
        market: Optional[str] = None,
        fields: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get full details of the items of a playlist owned by a Spotify user.
        
        Note: This endpoint replaced GET /playlists/{id}/tracks (deprecated).
        
        Args:
            playlist_id: The Spotify ID for the playlist
            market: An ISO 3166-1 alpha-2 country code
            fields: Filters for the query
            limit: The maximum number of items to return (1-100, default 20)
            offset: The index of the first item to return
        
        Returns:
            Paging object containing playlist track objects
        
        Example:
            items = spotify.get_playlist_items("3cEYpjA9oz9GiPac4AsH4n", limit=50)
        """
        params = {"limit": limit, "offset": offset}
        if market:
            params["market"] = market
        if fields:
            params["fields"] = fields
        
        return self._make_request("GET", f"/playlists/{playlist_id}/items", params=params)
    
    def add_items_to_playlist(
        self,
        playlist_id: str,
        uris: List[str],
        position: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Add one or more items to a user's playlist.
        
        Note: This endpoint replaced POST /playlists/{id}/tracks (deprecated).
        
        Args:
            playlist_id: The Spotify ID for the playlist
            uris: List of Spotify URIs to add (max 100)
            position: Position to insert the items (zero-based)
        
        Returns:
            Snapshot object
        
        Example:
            result = spotify.add_items_to_playlist(
                "3cEYpjA9oz9GiPac4AsH4n",
                ["spotify:track:4iV5W9uYEdYUVa79Axb7Rh"]
            )
        """
        data = {"uris": uris}
        if position is not None:
            data["position"] = position
        
        return self._make_request(
            "POST",
            f"/playlists/{playlist_id}/items",
            json_data=data
        )
    
    def remove_playlist_items(
        self,
        playlist_id: str,
        tracks: Optional[List[Dict]] = None,
        snapshot_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Remove one or more items from a user's playlist.
        
        Note: This endpoint replaced DELETE /playlists/{id}/tracks (deprecated).
        
        Args:
            playlist_id: The Spotify ID for the playlist
            tracks: List of objects containing Spotify URIs to remove
                   [{"uri": "spotify:track:..."}, ...]
            snapshot_id: The playlist's snapshot ID
        
        Returns:
            Snapshot object
        
        Example:
            result = spotify.remove_playlist_items(
                "3cEYpjA9oz9GiPac4AsH4n",
                tracks=[{"uri": "spotify:track:4iV5W9uYEdYUVa79Axb7Rh"}]
            )
        """
        data = {}
        if tracks:
            data["tracks"] = tracks
        if snapshot_id:
            data["snapshot_id"] = snapshot_id
        
        return self._make_request(
            "DELETE",
            f"/playlists/{playlist_id}/items",
            json_data=data
        )
    
    def update_playlist_items(
        self,
        playlist_id: str,
        range_start: Optional[int] = None,
        insert_before: Optional[int] = None,
        range_length: Optional[int] = None,
        snapshot_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Reorder a playlist's items.
        
        Note: This endpoint replaced PUT /playlists/{id}/tracks (deprecated).
        
        Args:
            playlist_id: The Spotify ID for the playlist
            range_start: Position of the first item to be reordered
            insert_before: Position where the items should be inserted
            range_length: Number of items to be reordered (default 1)
            snapshot_id: The playlist's snapshot ID
        
        Returns:
            Snapshot object
        
        Example:
            result = spotify.update_playlist_items(
                "3cEYpjA9oz9GiPac4AsH4n",
                range_start=0,
                insert_before=2
            )
        """
        data = {}
        if range_start is not None:
            data["range_start"] = range_start
        if insert_before is not None:
            data["insert_before"] = insert_before
        if range_length is not None:
            data["range_length"] = range_length
        if snapshot_id:
            data["snapshot_id"] = snapshot_id
        
        return self._make_request(
            "PUT",
            f"/playlists/{playlist_id}/items",
            json_data=data
        )
    
    def change_playlist_details(
        self,
        playlist_id: str,
        name: Optional[str] = None,
        public: Optional[bool] = None,
        collaborative: Optional[bool] = None,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Change a playlist's name and public/private state.
        
        Args:
            playlist_id: The Spotify ID for the playlist
            name: New name for the playlist
            public: Whether the playlist should be public
            collaborative: Whether the playlist should be collaborative
            description: New description for the playlist
        
        Example:
            spotify.change_playlist_details(
                "3cEYpjA9oz9GiPac4AsH4n",
                name="My New Playlist Name",
                description="Updated description"
            )
        """
        data = {}
        if name is not None:
            data["name"] = name
        if public is not None:
            data["public"] = public
        if collaborative is not None:
            data["collaborative"] = collaborative
        if description is not None:
            data["description"] = description
        
        return self._make_request(
            "PUT",
            f"/playlists/{playlist_id}",
            json_data=data
        )
    
    def get_playlist_cover_image(self, playlist_id: str) -> List[Dict[str, Any]]:
        """
        Get the current image associated with a specific playlist.
        
        Args:
            playlist_id: The Spotify ID for the playlist
        
        Returns:
            List of image objects
        
        Example:
            images = spotify.get_playlist_cover_image("3cEYpjA9oz9GiPac4AsH4n")
        """
        return self._make_request("GET", f"/playlists/{playlist_id}/images")
    
    def upload_playlist_cover_image(
        self,
        playlist_id: str,
        image_data: str
    ) -> Dict[str, Any]:
        """
        Replace the image used to represent a specific playlist.
        
        Args:
            playlist_id: The Spotify ID for the playlist
            image_data: Base64 encoded JPEG image data (max 256KB)
        
        Example:
            import base64
            with open("cover.jpg", "rb") as f:
                image_data = base64.b64encode(f.read()).decode()
            spotify.upload_playlist_cover_image("3cEYpjA9oz9GiPac4AsH4n", image_data)
        """
        headers = self._get_headers()
        headers["Content-Type"] = "image/jpeg"
        
        url = f"{self.BASE_URL}/playlists/{playlist_id}/images"
        response = self.session.put(url, headers=headers, data=image_data)
        
        return self._handle_response(response)
    
    def create_playlist(
        self,
        name: str,
        public: bool = True,
        collaborative: bool = False,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a playlist for a Spotify user.
        
        Note: This endpoint (POST /me/playlists) replaced the deprecated
        POST /users/{user_id}/playlists endpoint.
        
        Args:
            name: Name for the new playlist
            public: Whether the playlist should be public
            collaborative: Whether the playlist should be collaborative
            description: Description for the playlist
        
        Returns:
            Playlist object
        
        Example:
            playlist = spotify.create_playlist(
                "My New Playlist",
                description="A playlist created via API"
            )
        """
        data = {
            "name": name,
            "public": public,
            "collaborative": collaborative
        }
        if description:
            data["description"] = description
        
        return self._make_request("POST", "/me/playlists", json_data=data)
    
    def get_current_user_playlists(
        self,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get a list of the playlists owned or followed by the current Spotify user.
        
        Note: This endpoint (GET /me/playlists) replaced the deprecated
        GET /users/{id}/playlists endpoint.
        
        Args:
            limit: The maximum number of items to return (1-50, default 20)
            offset: The index of the first item to return
        
        Returns:
            Paging object containing simplified playlist objects
        
        Example:
            playlists = spotify.get_current_user_playlists(limit=50)
        """
        params = {"limit": limit, "offset": offset}
        return self._make_request("GET", "/me/playlists", params=params)

    # ==================== USERS ====================
    
    def get_current_user_profile(self) -> Dict[str, Any]:
        """
        Get detailed profile information about the current user.
        
        Note: This endpoint (GET /me) replaced the deprecated
        GET /users/{id} endpoint for accessing user profiles.
        
        Returns:
            User object
        
        Example:
            user = spotify.get_current_user_profile()
        """
        return self._make_request("GET", "/me")
    
    def get_user_top_items(
        self,
        item_type: str,
        time_range: str = "medium_term",
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get the current user's top artists or tracks.
        
        Args:
            item_type: The type of entity to return ("artists" or "tracks")
            time_range: Over what time frame ("long_term", "medium_term", "short_term")
            limit: The maximum number of items to return (1-50, default 20)
            offset: The index of the first item to return
        
        Returns:
            Paging object containing artist or track objects
        
        Example:
            top_artists = spotify.get_user_top_items("artists", time_range="short_term")
            top_tracks = spotify.get_user_top_items("tracks", limit=10)
        """
        params = {
            "time_range": time_range,
            "limit": limit,
            "offset": offset
        }
        return self._make_request("GET", f"/me/top/{item_type}", params=params)

    # ==================== LIBRARY ====================
    
    def get_user_saved_albums(
        self,
        limit: int = 20,
        offset: int = 0,
        market: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get a list of the albums saved in the current Spotify user's library.
        
        Args:
            limit: The maximum number of items to return (1-50, default 20)
            offset: The index of the first item to return
            market: An ISO 3166-1 alpha-2 country code
        
        Returns:
            Paging object containing saved album objects
        
        Example:
            albums = spotify.get_user_saved_albums(limit=50)
        """
        params = {"limit": limit, "offset": offset}
        if market:
            params["market"] = market
        return self._make_request("GET", "/me/albums", params=params)
    
    def get_user_saved_audiobooks(
        self,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get a list of the audiobooks saved in the current Spotify user's library.
        
        Args:
            limit: The maximum number of items to return (1-50, default 20)
            offset: The index of the first item to return
        
        Returns:
            Paging object containing saved audiobook objects
        
        Example:
            audiobooks = spotify.get_user_saved_audiobooks(limit=50)
        """
        params = {"limit": limit, "offset": offset}
        return self._make_request("GET", "/me/audiobooks", params=params)
    
    def get_user_saved_episodes(
        self,
        limit: int = 20,
        offset: int = 0,
        market: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get a list of the episodes saved in the current Spotify user's library.
        
        Args:
            limit: The maximum number of items to return (1-50, default 20)
            offset: The index of the first item to return
            market: An ISO 3166-1 alpha-2 country code
        
        Returns:
            Paging object containing saved episode objects
        
        Example:
            episodes = spotify.get_user_saved_episodes(limit=50)
        """
        params = {"limit": limit, "offset": offset}
        if market:
            params["market"] = market
        return self._make_request("GET", "/me/episodes", params=params)
    
    def get_user_saved_shows(
        self,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get a list of the shows saved in the current Spotify user's library.
        
        Args:
            limit: The maximum number of items to return (1-50, default 20)
            offset: The index of the first item to return
        
        Returns:
            Paging object containing saved show objects
        
        Example:
            shows = spotify.get_user_saved_shows(limit=50)
        """
        params = {"limit": limit, "offset": offset}
        return self._make_request("GET", "/me/shows", params=params)
    
    def get_user_saved_tracks(
        self,
        limit: int = 20,
        offset: int = 0,
        market: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get a list of the songs saved in the current Spotify user's library.
        
        Args:
            limit: The maximum number of items to return (1-50, default 20)
            offset: The index of the first item to return
            market: An ISO 3166-1 alpha-2 country code
        
        Returns:
            Paging object containing saved track objects
        
        Example:
            tracks = spotify.get_user_saved_tracks(limit=50)
        """
        params = {"limit": limit, "offset": offset}
        if market:
            params["market"] = market
        return self._make_request("GET", "/me/tracks", params=params)
    
    def save_to_library(
        self,
        ids: List[str],
        item_type: str
    ) -> Dict[str, Any]:
        """
        Save one or more items to the current user's library.
        
        Note: This consolidated endpoint (PUT /me/library) replaced individual
        save endpoints for albums, tracks, shows, episodes, and audiobooks.
        
        Args:
            ids: List of Spotify IDs to save (max 50)
            item_type: Type of items ("albums", "tracks", "shows", "episodes", "audiobooks")
        
        Example:
            spotify.save_to_library(["4aawyAB9vmqN3uQ7FjRGTy"], "albums")
            spotify.save_to_library(["11dFghVXANMlKmJXsNCbNl"], "tracks")
        """
        data = {"ids": ids}
        params = {"type": item_type}
        return self._make_request("PUT", "/me/library", params=params, json_data=data)
    
    def remove_from_library(
        self,
        ids: List[str],
        item_type: str
    ) -> Dict[str, Any]:
        """
        Remove one or more items from the current user's library.
        
        Note: This consolidated endpoint (DELETE /me/library) replaced individual
        remove endpoints for albums, tracks, shows, episodes, and audiobooks.
        
        Args:
            ids: List of Spotify IDs to remove (max 50)
            item_type: Type of items ("albums", "tracks", "shows", "episodes", "audiobooks")
        
        Example:
            spotify.remove_from_library(["4aawyAB9vmqN3uQ7FjRGTy"], "albums")
        """
        data = {"ids": ids}
        params = {"type": item_type}
        return self._make_request("DELETE", "/me/library", params=params, json_data=data)
    
    def check_saved_items(
        self,
        ids: List[str],
        item_type: str
    ) -> List[bool]:
        """
        Check if one or more items is already saved in the current user's library.
        
        Note: This consolidated endpoint (GET /me/library/contains) replaced individual
        check endpoints for albums, tracks, shows, episodes, and audiobooks.
        
        Args:
            ids: List of Spotify IDs to check (max 50)
            item_type: Type of items ("albums", "tracks", "shows", "episodes", "audiobooks")
        
        Returns:
            List of booleans indicating if each item is saved
        
        Example:
            is_saved = spotify.check_saved_items(["4aawyAB9vmqN3uQ7FjRGTy"], "albums")
        """
        params = {
            "ids": ",".join(ids),
            "type": item_type
        }
        return self._make_request("GET", "/me/library/contains", params=params)
    
    def get_followed_artists(
        self,
        after: Optional[str] = None,
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        Get the current user's followed artists.
        
        Args:
            after: The last artist ID retrieved from the previous request
            limit: The maximum number of items to return (1-50, default 20)
        
        Returns:
            Cursor-based paging object containing full artist objects
        
        Example:
            artists = spotify.get_followed_artists(limit=50)
        """
        params = {
            "type": "artist",
            "limit": limit
        }
        if after:
            params["after"] = after
        return self._make_request("GET", "/me/following", params=params)

    # ==================== PLAYER ====================
    
    def get_playback_state(self, market: Optional[str] = None) -> Dict[str, Any]:
        """
        Get information about the user's current playback state.
        
        Args:
            market: An ISO 3166-1 alpha-2 country code
        
        Returns:
            Current playback state object
        
        Example:
            playback = spotify.get_playback_state()
        """
        params = {}
        if market:
            params["market"] = market
        return self._make_request("GET", "/me/player", params=params)
    
    def get_available_devices(self) -> Dict[str, Any]:
        """
        Get information about a user's available devices.
        
        Returns:
            Object containing list of device objects
        
        Example:
            devices = spotify.get_available_devices()
        """
        return self._make_request("GET", "/me/player/devices")
    
    def get_currently_playing(self, market: Optional[str] = None) -> Dict[str, Any]:
        """
        Get the object currently being played on the user's Spotify account.
        
        Args:
            market: An ISO 3166-1 alpha-2 country code
        
        Returns:
            Currently playing object
        
        Example:
            current = spotify.get_currently_playing()
        """
        params = {}
        if market:
            params["market"] = market
        return self._make_request("GET", "/me/player/currently-playing", params=params)
    
    def get_recently_played(
        self,
        limit: int = 20,
        after: Optional[int] = None,
        before: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get tracks from the current user's recently played tracks.
        
        Args:
            limit: The maximum number of items to return (1-50, default 20)
            after: Unix timestamp in milliseconds (items after this time)
            before: Unix timestamp in milliseconds (items before this time)
        
        Returns:
            Cursor-based paging object containing play history objects
        
        Example:
            recent = spotify.get_recently_played(limit=50)
        """
        params = {"limit": limit}
        if after:
            params["after"] = after
        if before:
            params["before"] = before
        return self._make_request("GET", "/me/player/recently-played", params=params)
    
    def get_queue(self) -> Dict[str, Any]:
        """
        Get the list of objects that make up the user's queue.
        
        Returns:
            Object containing currently playing and queue items
        
        Example:
            queue = spotify.get_queue()
        """
        return self._make_request("GET", "/me/player/queue")
    
    def add_to_queue(self, uri: str, device_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Add an item to the end of the user's current playback queue.
        
        Args:
            uri: Spotify URI of the item to add
            device_id: ID of the device to target
        
        Example:
            spotify.add_to_queue("spotify:track:4iV5W9uYEdYUVa79Axb7Rh")
        """
        params = {"uri": uri}
        if device_id:
            params["device_id"] = device_id
        return self._make_request("POST", "/me/player/queue", params=params)
    
    def start_playback(
        self,
        device_id: Optional[str] = None,
        context_uri: Optional[str] = None,
        uris: Optional[List[str]] = None,
        offset: Optional[Dict] = None,
        position_ms: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Start a new context or resume current playback on the user's active device.
        
        Args:
            device_id: ID of the device to target
            context_uri: Spotify URI of the context to play (album, artist, playlist)
            uris: List of Spotify URIs to play
            offset: Indicates from where in the context playback should start
                   {"position": 0} or {"uri": "spotify:track:..."}
            position_ms: The position in milliseconds to start playback from
        
        Example:
            # Play a playlist
            spotify.start_playback(context_uri="spotify:playlist:3cEYpjA9oz9GiPac4AsH4n")
            
            # Play specific tracks
            spotify.start_playback(uris=["spotify:track:4iV5W9uYEdYUVa79Axb7Rh"])
        """
        params = {}
        if device_id:
            params["device_id"] = device_id
        
        data = {}
        if context_uri:
            data["context_uri"] = context_uri
        if uris:
            data["uris"] = uris
        if offset:
            data["offset"] = offset
        if position_ms is not None:
            data["position_ms"] = position_ms
        
        return self._make_request("PUT", "/me/player/play", params=params, json_data=data)
    
    def pause_playback(self, device_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Pause playback on the user's account.
        
        Args:
            device_id: ID of the device to target
        
        Example:
            spotify.pause_playback()
        """
        params = {}
        if device_id:
            params["device_id"] = device_id
        return self._make_request("PUT", "/me/player/pause", params=params)
    
    def skip_to_next(self, device_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Skips to next track in the user's queue.
        
        Args:
            device_id: ID of the device to target
        
        Example:
            spotify.skip_to_next()
        """
        params = {}
        if device_id:
            params["device_id"] = device_id
        return self._make_request("POST", "/me/player/next", params=params)
    
    def skip_to_previous(self, device_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Skips to previous track in the user's queue.
        
        Args:
            device_id: ID of the device to target
        
        Example:
            spotify.skip_to_previous()
        """
        params = {}
        if device_id:
            params["device_id"] = device_id
        return self._make_request("POST", "/me/player/previous", params=params)
    
    def seek_to_position(
        self,
        position_ms: int,
        device_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Seeks to the given position in the user's currently playing track.
        
        Args:
            position_ms: Position in milliseconds to seek to
            device_id: ID of the device to target
        
        Example:
            spotify.seek_to_position(30000)  # Seek to 30 seconds
        """
        params = {"position_ms": position_ms}
        if device_id:
            params["device_id"] = device_id
        return self._make_request("PUT", "/me/player/seek", params=params)
    
    def set_repeat_mode(
        self,
        state: str,
        device_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Set the repeat mode for the user's playback.
        
        Args:
            state: Repeat mode ("track", "context", or "off")
            device_id: ID of the device to target
        
        Example:
            spotify.set_repeat_mode("context")
        """
        params = {"state": state}
        if device_id:
            params["device_id"] = device_id
        return self._make_request("PUT", "/me/player/repeat", params=params)
    
    def set_volume(
        self,
        volume_percent: int,
        device_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Set the volume for the user's current playback device.
        
        Args:
            volume_percent: Volume percentage (0-100)
            device_id: ID of the device to target
        
        Example:
            spotify.set_volume(50)
        """
        params = {"volume_percent": volume_percent}
        if device_id:
            params["device_id"] = device_id
        return self._make_request("PUT", "/me/player/volume", params=params)
    
    def toggle_shuffle(
        self,
        state: bool,
        device_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Toggle shuffle on or off for user's playback.
        
        Args:
            state: True to enable shuffle, False to disable
            device_id: ID of the device to target
        
        Example:
            spotify.toggle_shuffle(True)
        """
        params = {"state": str(state).lower()}
        if device_id:
            params["device_id"] = device_id
        return self._make_request("PUT", "/me/player/shuffle", params=params)
    
    def transfer_playback(
        self,
        device_ids: List[str],
        play: bool = False
    ) -> Dict[str, Any]:
        """
        Transfer playback to a new device.
        
        Args:
            device_ids: List containing the ID of the device to transfer to
            play: Whether to ensure playback happens on new device
        
        Example:
            spotify.transfer_playback(["74ASZWbe4lXaubB36ztrGX"], play=True)
        """
        data = {
            "device_ids": device_ids,
            "play": play
        }
        return self._make_request("PUT", "/me/player", json_data=data)

    # ==================== SEARCH ====================
    
    def search(
        self,
        query: str,
        search_types: List[str],
        market: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get Spotify catalog information about albums, artists, playlists, tracks, 
        shows, episodes, or audiobooks that match a keyword string.
        
        Args:
            query: Search query keywords and optional field filters
            search_types: List of item types to search across
                         ("album", "artist", "playlist", "track", "show", "episode", "audiobook")
            market: An ISO 3166-1 alpha-2 country code
            limit: Maximum number of results to return (1-50, default 20)
            offset: Index of the first result to return
        
        Returns:
            Search response object containing results for each requested type
        
        Example:
            results = spotify.search(
                "artist:radiohead track:creep",
                ["track"],
                limit=10
            )
            
            # Search multiple types
            results = spotify.search(
                "rock",
                ["album", "artist", "track"],
                limit=20
            )
        """
        params = {
            "q": query,
            "type": ",".join(search_types),
            "limit": limit,
            "offset": offset
        }
        if market:
            params["market"] = market
        
        return self._make_request("GET", "/search", params=params)

    # ==================== SHOWS (PODCASTS) ====================
    
    def get_show(self, show_id: str, market: Optional[str] = None) -> Dict[str, Any]:
        """
        Get Spotify catalog information for a single show.
        
        Args:
            show_id: The Spotify ID for the show
            market: An ISO 3166-1 alpha-2 country code
        
        Returns:
            Show object
        
        Example:
            show = spotify.get_show("5CfCWKI5pZ28U0uOzXkDHe")
        """
        params = {}
        if market:
            params["market"] = market
        return self._make_request("GET", f"/shows/{show_id}", params=params)
    
    def get_show_episodes(
        self,
        show_id: str,
        market: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get Spotify catalog information about a show's episodes.
        
        Args:
            show_id: The Spotify ID for the show
            market: An ISO 3166-1 alpha-2 country code
            limit: The maximum number of items to return (1-50, default 20)
            offset: The index of the first item to return
        
        Returns:
            Paging object containing simplified episode objects
        
        Example:
            episodes = spotify.get_show_episodes("5CfCWKI5pZ28U0uOzXkDHe", limit=50)
        """
        params = {"limit": limit, "offset": offset}
        if market:
            params["market"] = market
        return self._make_request("GET", f"/shows/{show_id}/episodes", params=params)

    # ==================== EPISODES ====================
    
    def get_episode(self, episode_id: str, market: Optional[str] = None) -> Dict[str, Any]:
        """
        Get Spotify catalog information for a single episode.
        
        Args:
            episode_id: The Spotify ID for the episode
            market: An ISO 3166-1 alpha-2 country code
        
        Returns:
            Episode object
        
        Example:
            episode = spotify.get_episode("512ojhOuo1ktJprKbVcKyQ")
        """
        params = {}
        if market:
            params["market"] = market
        return self._make_request("GET", f"/episodes/{episode_id}", params=params)

    # ==================== AUDIOBOOKS ====================
    
    def get_audiobook(self, audiobook_id: str, market: Optional[str] = None) -> Dict[str, Any]:
        """
        Get Spotify catalog information for a single audiobook.
        
        Args:
            audiobook_id: The Spotify ID for the audiobook
            market: An ISO 3166-1 alpha-2 country code
        
        Returns:
            Audiobook object
        
        Example:
            audiobook = spotify.get_audiobook("7iHfbu1YPACw6oZPAFJtqe")
        """
        params = {}
        if market:
            params["market"] = market
        return self._make_request("GET", f"/audiobooks/{audiobook_id}", params=params)
    
    def get_audiobook_chapters(
        self,
        audiobook_id: str,
        market: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get Spotify catalog information about an audiobook's chapters.
        
        Args:
            audiobook_id: The Spotify ID for the audiobook
            market: An ISO 3166-1 alpha-2 country code
            limit: The maximum number of items to return (1-50, default 20)
            offset: The index of the first item to return
        
        Returns:
            Paging object containing simplified chapter objects
        
        Example:
            chapters = spotify.get_audiobook_chapters("7iHfbu1YPACw6oZPAFJtqe", limit=50)
        """
        params = {"limit": limit, "offset": offset}
        if market:
            params["market"] = market
        return self._make_request("GET", f"/audiobooks/{audiobook_id}/chapters", params=params)

    # ==================== CHAPTERS ====================
    
    def get_chapter(self, chapter_id: str, market: Optional[str] = None) -> Dict[str, Any]:
        """
        Get Spotify catalog information for a single chapter.
        
        Args:
            chapter_id: The Spotify ID for the chapter
            market: An ISO 3166-1 alpha-2 country code
        
        Returns:
            Chapter object
        
        Example:
            chapter = spotify.get_chapter("0D5wENdkdwbqlrHoaJ9g29")
        """
        params = {}
        if market:
            params["market"] = market
        return self._make_request("GET", f"/chapters/{chapter_id}", params=params)


# ==================== DEPRECATED/REMOVED ENDPOINTS DOCUMENTATION ====================

"""
DEPRECATED/REMOVED ENDPOINTS (November 2024 & February 2026)
============================================================

The following endpoints have been removed or deprecated by Spotify.
These are documented here for reference only - they will not work.

REMOVED ENDPOINTS:
------------------

1. Related Artists
   OLD: GET /artists/{id}/related-artists
   STATUS: Removed November 2024
   ALTERNATIVE: None available

2. Recommendations
   OLD: GET /recommendations
   STATUS: Removed November 2024
   ALTERNATIVE: None available

3. Audio Features
   OLD: GET /audio-features/{id}
   OLD: GET /audio-features
   STATUS: Removed November 2024
   ALTERNATIVE: None available

4. Audio Analysis
   OLD: GET /audio-analysis/{id}
   STATUS: Removed November 2024
   ALTERNATIVE: None available

5. Get Featured Playlists
   OLD: GET /browse/featured-playlists
   STATUS: Removed November 2024
   ALTERNATIVE: None available

6. Get Category's Playlists
   OLD: GET /browse/categories/{id}/playlists
   STATUS: Removed November 2024
   ALTERNATIVE: None available

7. Get Artist's Top Tracks
   OLD: GET /artists/{id}/top-tracks
   STATUS: Removed February 2026
   ALTERNATIVE: None available

8. Get Available Markets
   OLD: GET /markets
   STATUS: Removed February 2026
   ALTERNATIVE: None available

9. Get New Releases
   OLD: GET /browse/new-releases
   STATUS: Removed February 2026
   ALTERNATIVE: None available

10. Get Several Albums (Batch)
    OLD: GET /albums?ids=...
    STATUS: Removed February 2026
    ALTERNATIVE: Make individual requests to GET /albums/{id}

11. Get Several Artists (Batch)
    OLD: GET /artists?ids=...
    STATUS: Removed February 2026
    ALTERNATIVE: Make individual requests to GET /artists/{id}

12. Get Several Tracks (Batch)
    OLD: GET /tracks?ids=...
    STATUS: Removed February 2026
    ALTERNATIVE: Make individual requests to GET /tracks/{id}

13. Get Several Shows (Batch)
    OLD: GET /shows?ids=...
    STATUS: Removed February 2026
    ALTERNATIVE: Make individual requests to GET /shows/{id}

14. Get Several Episodes (Batch)
    OLD: GET /episodes?ids=...
    STATUS: Removed February 2026
    ALTERNATIVE: Make individual requests to GET /episodes/{id}

15. Get Several Audiobooks (Batch)
    OLD: GET /audiobooks?ids=...
    STATUS: Removed February 2026
    ALTERNATIVE: Make individual requests to GET /audiobooks/{id}

16. Get Several Chapters (Batch)
    OLD: GET /chapters?ids=...
    STATUS: Removed February 2026
    ALTERNATIVE: Make individual requests to GET /chapters/{id}

17. Get Several Categories (Batch)
    OLD: GET /browse/categories?ids=...
    STATUS: Removed February 2026
    ALTERNATIVE: None available

18. Create Playlist (User-specific)
    OLD: POST /users/{user_id}/playlists
    STATUS: Removed February 2026
    ALTERNATIVE: Use POST /me/playlists

19. Get User's Playlists (by user ID)
    OLD: GET /users/{id}/playlists
    STATUS: Removed February 2026
    ALTERNATIVE: Use GET /me/playlists for current user

20. Get User's Profile (by user ID)
    OLD: GET /users/{id}
    STATUS: Removed February 2026
    ALTERNATIVE: Use GET /me for current user's profile

CONSOLIDATED ENDPOINTS (February 2026):
---------------------------------------

Library operations have been consolidated:

OLD ENDPOINTS (REMOVED):
- PUT /me/albums (Save Albums)
- DELETE /me/albums (Remove Albums)
- GET /me/albums/contains (Check Saved Albums)
- PUT /me/tracks (Save Tracks)
- DELETE /me/tracks (Remove Tracks)
- GET /me/tracks/contains (Check Saved Tracks)
- PUT /me/shows (Save Shows)
- DELETE /me/shows (Remove Shows)
- GET /me/shows/contains (Check Saved Shows)
- PUT /me/episodes (Save Episodes)
- DELETE /me/episodes (Remove Episodes)
- GET /me/episodes/contains (Check Saved Episodes)
- PUT /me/audiobooks (Save Audiobooks)
- DELETE /me/audiobooks (Remove Audiobooks)
- GET /me/audiobooks/contains (Check Saved Audiobooks)

NEW CONSOLIDATED ENDPOINTS:
- PUT /me/library (Save to Library)
- DELETE /me/library (Remove from Library)
- GET /me/library/contains (Check User's Saved Items)

Playlist tracks endpoints have been updated:

OLD ENDPOINTS (DEPRECATED):
- GET /playlists/{id}/tracks
- POST /playlists/{id}/tracks
- DELETE /playlists/{id}/tracks
- PUT /playlists/{id}/tracks

NEW ENDPOINTS:
- GET /playlists/{id}/items
- POST /playlists/{id}/items
- DELETE /playlists/{id}/items
- PUT /playlists/{id}/items
"""


# ==================== EXAMPLE USAGE ====================

if __name__ == "__main__":
    """
    Example usage of the SpotifyAPI class.
    
    Note: You need to obtain a Client ID and Client Secret from the
    Spotify Developer Dashboard (https://developer.spotify.com/dashboard)
    """
    
    # Example 1: Client Credentials Flow (for public data only)
    # This flow does not require user authorization
    print("=== Client Credentials Flow Example ===")
    
    # spotify = SpotifyAPI(
    #     client_id="your_client_id",
    #     client_secret="your_client_secret"
    # )
    # 
    # # Get an album
    # album = spotify.get_album("4aawyAB9vmqN3uQ7FjRGTy")
    # print(f"Album: {album['name']}")
    # 
    # # Get album tracks
    # tracks = spotify.get_album_tracks("4aawyAB9vmqN3uQ7FjRGTy", limit=5)
    # print(f"Tracks: {[track['name'] for track in tracks['items']]}")
    # 
    # # Search for tracks
    # results = spotify.search("artist:radiohead track:creep", ["track"], limit=5)
    # print(f"Search results: {[track['name'] for track in results['tracks']['items']]}")
    
    # Example 2: Authorization Code Flow (for user data)
    # This flow requires user authorization and an access token
    print("\n=== Authorization Code Flow Example ===")
    
    # spotify = SpotifyAPI(access_token="user_access_token")
    # 
    # # Get current user's profile
    # user = spotify.get_current_user_profile()
    # print(f"User: {user['display_name']}")
    # 
    # # Get user's playlists
    # playlists = spotify.get_current_user_playlists(limit=10)
    # print(f"Playlists: {[pl['name'] for pl in playlists['items']]}")
    # 
    # # Create a new playlist
    # new_playlist = spotify.create_playlist(
    #     name="My API Playlist",
    #     description="Created with Spotify Web API"
    # )
    # print(f"Created playlist: {new_playlist['name']}")
    # 
    # # Add tracks to playlist
    # spotify.add_items_to_playlist(
    #     new_playlist['id'],
    #     ["spotify:track:4iV5W9uYEdYUVa79Axb7Rh"]
    # )
    # 
    # # Get playback state
    # playback = spotify.get_playback_state()
    # if playback and playback.get('is_playing'):
    #     print(f"Currently playing: {playback['item']['name']}")
    # 
    # # Control playback
    # spotify.pause_playback()
    # spotify.skip_to_next()
    # spotify.set_volume(50)
    
    print("\n=== Examples completed ===")
    print("Uncomment the example code and add your credentials to test.")
