import requests
import json

# ================= 配置区域 =================
ACCESS_TOKEN = "BQAYt1IAFKmOX-mDcEzQogIVtDIU6Il_t0aZnoo4z8q-WspnOC7kGzkMEWzcNkhXRM9Nj6Iotwgm6_fd4eBrfyeq6WAZmgym7fFNlvefytyJfDNy6DlebBF1yKtxbwYSQOhi00Vhr7Cu7zjZAsOkjjsca8XijDnSz1BjO0LGWMyTeBz2bvOl6ImJfuez10L1q_VHDUoscgAGaI3gUyXMZthBAWPPkEJbhXVh-P2GL2-ecT_0zz950neueg83Eh0rlDMpIg"
TARGET_URL = "https://api.spotify.com/v1/playlists/4WwBzSY7IxPfQQlw2K7dLC"
# ===========================================

def parse_spotify_link(url):
    if "playlist/" in url:
        return url.split("playlist/")[1].split("?")[0]
    return url.split("/")[-1].split("?")[0]

def get_playlist_data(playlist_id, token):
    api_url = f"https://api.spotify.com/v1/playlists/{playlist_id}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    print(f"🔄 正在连接 API (ID: {playlist_id})...")
    
    try:
        response = requests.get(api_url, headers=headers)
        if response.status_code != 200:
            print(f"❌ 请求失败: {response.status_code}")
            return

        data = response.json()
        print(f"\n✅ 成功获取歌单: {data.get('name', 'Unknown')}")
        
        # 1. 智能定位列表容器
        if 'items' in data and isinstance(data['items'], dict):
            container = data['items'] # 您的特殊结构
        elif 'tracks' in data:
            container = data['tracks'] # 标准结构
        else:
            print("❌ 找不到歌曲列表容器")
            return

        # 2. 下载所有数据
        all_items = list(container.get('items', []))
        next_url = container.get('next')
        
        while next_url:
            print(f"   正在下载... (当前: {len(all_items)})", end="\r")
            res = requests.get(next_url, headers=headers)
            if res.status_code != 200: break
            page_data = res.json()
            
            # 处理翻页数据的特殊结构
            if 'items' in page_data:
                if isinstance(page_data['items'], list):
                    items_list = page_data['items']
                    next_url = page_data.get('next')
                elif isinstance(page_data['items'], dict):
                    items_list = page_data['items'].get('items', [])
                    next_url = page_data['items'].get('next')
                else:
                    items_list = []
                    next_url = None
                all_items.extend(items_list)
            else:
                break

        print(f"\n✅ 下载完成! 共 {len(all_items)} 首。\n")

        # 3. 打印 (关键修复点)
        print(f"{'#':<4} | {'歌名':<35} | {'艺术家':<25} | {'专辑'}")
        print("=" * 90)

        for i, entry in enumerate(all_items):
            try:
                # 尝试多种可能的字段名
                # 优先级: 'track' -> 'item' -> entry本身
                track = entry.get('track') 
                if not track:
                    track = entry.get('item') # <--- 增加这个检查
                if not track:
                    if 'name' in entry: track = entry
                
                if not track: continue

                name = track.get('name', '未知')
                
                # 处理艺术家
                artists = track.get('artists', [])
                if isinstance(artists, list):
                    artist_str = ", ".join([a.get('name', '') for a in artists])
                else:
                    artist_str = "未知"
                
                # 处理专辑
                album = track.get('album', {}).get('name', '未知')

                print(f"{i+1:<4} | {name[:33]:<35} | {artist_str[:23]:<25} | {album[:30]}")
            except Exception:
                continue
        print("=" * 90)

    except Exception as e:
        print(f"❌ 发生错误: {e}")

if __name__ == "__main__":
    pid = parse_spotify_link(TARGET_URL)
    get_playlist_data(pid, ACCESS_TOKEN)