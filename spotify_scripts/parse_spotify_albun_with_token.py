import requests
import json

def get_album_details(album_id_or_url, access_token):
    """
    使用 Access Token 获取 Spotify 专辑详细信息
    :param album_id_or_url: 专辑 ID (例如 "2up3OPMp9Tb4dAKM2erWXQ") 或 完整链接
    :param access_token: 有效的 Access Token (Bearer ...)
    :return: 解析后的字典数据，如果失败返回 None
    """
    
    # 1. 提取 Album ID (简单的清洗逻辑)
    album_id = album_id_or_url
    if "album/" in album_id_or_url:
        # 从链接中提取 ID: .../album/2up3OPMp9Tb4dAKM2erWXQ?si=...
        album_id = album_id_or_url.split("album/")[1].split("?")[0]
    elif "spotify.com" in album_id_or_url:
        # 处理可能的其他长链接格式
        album_id = album_id_or_url.split("/")[-1].split("?")[0]

    # 2. 构造标准 API URL
    api_url = f"https://api.spotify.com/v1/albums/{album_id}"
    
    # 3. 设置请求头
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    print(f"🔄 正在获取专辑信息 (ID: {album_id})...")
    
    try:
        response = requests.get(api_url, headers=headers)
        
        # 4. 错误处理
        if response.status_code != 200:
            print(f"❌ 请求失败: {response.status_code}")
            print(f"错误信息: {response.text}")
            return None
            
        return response.json()

    except Exception as e:
        print(f"❌ 发生异常: {e}")
        return None

# ================= 使用示例 =================

if __name__ == "__main__":
    # 填入您的 Access Token
    MY_TOKEN = "BQAYt1IAFKmOX-mDcEzQogIVtDIU6Il_t0aZnoo4z8q-WspnOC7kGzkMEWzcNkhXRM9Nj6Iotwgm6_fd4eBrfyeq6WAZmgym7fFNlvefytyJfDNy6DlebBF1yKtxbwYSQOhi00Vhr7Cu7zjZAsOkjjsca8XijDnSz1BjO0LGWMyTeBz2bvOl6ImJfuez10L1q_VHDUoscgAGaI3gUyXMZthBAWPPkEJbhXVh-P2GL2-ecT_0zz950neueg83Eh0rlDMpIg"

    # 填入专辑 ID 或 链接
    # 示例 ID (来自您的 Response example): 2up3OPMp9Tb4dAKM2erWXQ
    ALBUM_TARGET = "https://open.spotify.com/album/28IDISyL4r5E5PXP0aQMnl?si=rN5fQLLATfi_TKUeL_nO1A" 

    if MY_TOKEN != "您的_ACCESS_TOKEN_粘贴在这里":
        album_data = get_album_details(ALBUM_TARGET, MY_TOKEN)
        
        if album_data:
            print("\n✅ 获取成功！专辑详情：")
            print("=" * 60)
            
            # 打印基本信息
            name = album_data.get('name')
            release_date = album_data.get('release_date')
            label = album_data.get('label')
            total_tracks = album_data.get('total_tracks')
            
            # 获取艺术家 (可能有多个)
            artists = ", ".join([a['name'] for a in album_data.get('artists', [])])
            
            print(f"💿 专辑名: {name}")
            print(f"🎤 艺术家: {artists}")
            print(f"📅 发行日: {release_date}")
            print(f"🏷️ 发行方: {label}")
            print(f"🔢 总曲目: {total_tracks} 首")
            print("-" * 60)
            
            # 打印曲目列表 (Standard Structure: tracks -> items)
            tracks_data = album_data.get('tracks', {})
            items = tracks_data.get('items', [])
            
            print(f"{'#':<4} | {'歌名':<40} | {'时长'}")
            print("-" * 60)
            
            for track in items:
                track_name = track.get('name', 'Unknown')
                track_num = track.get('track_number')
                
                # 毫秒转分秒
                ms = track.get('duration_ms', 0)
                minutes = (ms // 1000) // 60
                seconds = (ms // 1000) % 60
                duration_str = f"{minutes}:{seconds:02d}"
                
                print(f"{track_num:<4} | {track_name[:38]:<40} | {duration_str}")
            print("=" * 60)
    else:
        print("请先在脚本中填入您的 Access Token 再运行。")