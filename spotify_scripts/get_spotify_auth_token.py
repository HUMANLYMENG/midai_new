import spotipy
from spotipy.oauth2 import SpotifyOAuth
import requests

# ================= 配置区域 =================
CLIENT_ID = '98d47f42ea224ec1a077da4463b528b3'
CLIENT_SECRET = 'b6332169781343adb9df39ea18eaa380'
REDIRECT_URI = 'http://127.0.0.1:8888/callback'
# ===========================================

def resolve_redirect_url(url):
    """解析跳转链接"""
    if "googleusercontent.com" in url or "bit.ly" in url:
        print(f"🔄 正在解析跳转链接...")
        try:
            response = requests.get(url, allow_redirects=True, stream=True, timeout=10)
            return response.url
        except:
            pass
    return url

def main():
    print("--- 🎵 Spotify 解析器 (显示 Token 版) ---")
    
    scope = "playlist-read-private playlist-read-collaborative"

    # 1. 初始化认证管理器
    auth_manager = SpotifyOAuth(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        redirect_uri=REDIRECT_URI,
        scope=scope,
        cache_path=".spotify_cache",
        open_browser=True
    )

    # 2. 获取并打印 Token (新增部分)
    # 这会强制读取当前有效的 Token，如果是新的会刷新
    token_info = auth_manager.get_access_token(as_dict=True)
    access_token = token_info['access_token']
    
    print("\n" + "="*20 + " 🔑 ACCESS TOKEN " + "="*20)
    print(access_token)
    print("="*56)
    print(f"(Token 有效期剩余: {token_info['expires_in']} 秒)\n")

    # 3. 初始化客户端
    sp = spotipy.Spotify(auth_manager=auth_manager)
    
    print(f"👤 当前登录用户: {sp.me()['display_name']}")

    # 4. 输入链接继续测试
    raw_url = input("\n请输入歌单链接: ").strip()
    if not raw_url: return

    real_url = resolve_redirect_url(raw_url)
    
    # 提取 ID
    if "playlist/" in real_url:
        playlist_id = real_url.split("playlist/")[1].split("?")[0]
    else:
        playlist_id = real_url.split("/")[-1].split("?")[0]

    print(f"\n📥 正在尝试下载 (ID: {playlist_id})...")

    try:
        results = sp.playlist_tracks(playlist_id)
        tracks = results['items']
        while results['next']:
            results = sp.next(results)
            tracks.extend(results['items'])

        print(f"\n✅ 成功! 共 {len(tracks)} 首歌曲。")
        for i, item in enumerate(tracks[:5]): # 只打印前5首作为示例
            track = item['track']
            print(f"{i+1}. {track['name']} - {track['artists'][0]['name']}")

    except Exception as e:
        print(f"\n❌ 依然报错: {e}")
        print("\n💡 调试建议:")
        print("请复制上面的 Token，尝试用 curl 或 Postman 手动访问一下，看看是不是 Token 本身权限的问题。")

if __name__ == "__main__":
    main()