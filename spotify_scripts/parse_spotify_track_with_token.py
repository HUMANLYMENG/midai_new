import requests
import json
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 从环境变量获取 Access Token
ACCESS_TOKEN = os.getenv('SPOTIFY_ACCESS_TOKEN')


def get_track_details(track_id_or_url, access_token):
    """
    使用 Access Token 获取 Spotify 单曲详细信息
    :param track_id_or_url: 歌曲 ID (例如 "0NrtwAmRAdLxua31SzHvXr") 或 完整链接
    :param access_token: 有效的 Access Token
    :return: 解析后的字典数据
    """
    
    # 1. 提取 Track ID
    track_id = track_id_or_url
    if "track/" in track_id_or_url:
        # 从链接提取: .../track/0NrtwAmRAdLxua31SzHvXr?si=...
        track_id = track_id_or_url.split("track/")[1].split("?")[0]
    elif "http" in track_id_or_url:
        # 处理其他可能的长链接
        track_id = track_id_or_url.split("/")[-1].split("?")[0]

    # 2. 构造标准 API URL
    # 注意：这里使用 Spotify 官方标准 API 地址，以确保对所有 ID 有效
    api_url = f"https://api.spotify.com/v1/tracks/{track_id}"
    
    # 3. 设置请求头
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    print(f"🔄 正在获取歌曲信息 (ID: {track_id})...")
    
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
    # 检查环境变量
    if not ACCESS_TOKEN:
        print("❌ 错误: 请设置环境变量 SPOTIFY_ACCESS_TOKEN")
        print("\n在 .env 文件中添加:")
        print("  SPOTIFY_ACCESS_TOKEN=your_access_token_here")
        exit(1)
    
    # 填入歌曲 ID 或 链接
    # 示例 ID (来自之前的 Kanye West - Everything I Am): 0NrtwAmRAdLxua31SzHvXr
    TRACK_TARGET = "0NrtwAmRAdLxua31SzHvXr"

    track_data = get_track_details(TRACK_TARGET, ACCESS_TOKEN)
    
    if track_data:
        print("\n✅ 获取成功！歌曲详情：")
        print("=" * 60)
        
        # --- 解析基础信息 ---
        name = track_data.get('name')
        popularity = track_data.get('popularity')
        explicit = track_data.get('explicit')
        
        # --- 解析艺术家 ---
        artists = ", ".join([a['name'] for a in track_data.get('artists', [])])
        
        # --- 解析专辑 ---
        album_info = track_data.get('album', {})
        album_name = album_info.get('name')
        release_date = album_info.get('release_date')
        
        # --- 解析时长 (毫秒 -> 分:秒) ---
        ms = track_data.get('duration_ms', 0)
        minutes = (ms // 1000) // 60
        seconds = (ms // 1000) % 60
        duration_str = f"{minutes}:{seconds:02d}"

        # --- 打印输出 ---
        print(f"🎵 歌名: {name}")
        print(f"🎤 歌手: {artists}")
        print(f"💿 专辑: {album_name} ({release_date})")
        print(f"⏳ 时长: {duration_str}")
        print(f"🔥 热度: {popularity}/100")
        print(f"⚠️ 脏标: {'是' if explicit else '否'}")
        
        # --- 链接 ---
        spotify_url = track_data.get('external_urls', {}).get('spotify')
        if spotify_url:
            print(f"🔗 链接: {spotify_url}")
            
        print("=" * 60)
