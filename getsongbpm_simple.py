#!/usr/bin/env python3
"""
GetSongBPM API 简单查询工具
快速获取歌曲的 BPM 和 Key
"""

import sys
import requests

API_KEY = "3febde9e55b01ab5720a7fc6ada95ef6"
BASE_URL = "https://api.getsongbpm.com"


def get_tempo_and_key(song_name: str, artist_name: str = None):
    """获取歌曲的 Tempo 和 Key"""
    
    params = {
        'api_key': API_KEY,
        'limit': 5
    }
    
    if song_name:
        params['song_name'] = song_name
    if artist_name:
        params['artist_name'] = artist_name
    
    try:
        response = requests.get(f"{BASE_URL}/search", params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if 'song' in data and len(data['song']) > 0:
            # 查找最佳匹配
            songs = data['song']
            
            if artist_name:
                artist_lower = artist_name.lower()
                for song in songs:
                    if artist_lower in song.get('artist', {}).get('name', '').lower():
                        return song
            
            # 返回第一个结果
            return songs[0]
        
        return None
        
    except Exception as e:
        print(f"错误: {e}")
        return None


def main():
    if len(sys.argv) < 2:
        print("用法:")
        print(f"  python {sys.argv[0]} \"歌曲名\" [\"艺人名\"]")
        print()
        print("示例:")
        print(f'  python {sys.argv[0]} "Shape of You" "Ed Sheeran"')
        print(f'  python {sys.argv[0]} "Bohemian Rhapsody"')
        return
    
    song_name = sys.argv[1]
    artist_name = sys.argv[2] if len(sys.argv) > 2 else None
    
    print(f"\n搜索: {song_name}")
    if artist_name:
        print(f"艺人: {artist_name}")
    print("-" * 40)
    
    result = get_tempo_and_key(song_name, artist_name)
    
    if result:
        print(f"✓ 找到歌曲!")
        print(f"  标题: {result.get('song_title', 'N/A')}")
        print(f"  艺人: {result.get('artist', {}).get('name', 'N/A')}")
        print(f"  BPM (Tempo): {result.get('tempo', 'N/A')}")
        print(f"  Key (调性): {result.get('key_of', 'N/A')}")
    else:
        print("✗ 未找到歌曲信息")


if __name__ == "__main__":
    main()
