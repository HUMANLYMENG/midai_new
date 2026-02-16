#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Spotify Audio Features 获取工具
用于获取Spotify歌曲的音频特征数据
"""

import requests
import json
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 从环境变量获取 Access Token
ACCESS_TOKEN = os.getenv('SPOTIFY_ACCESS_TOKEN')


def get_audio_features(track_ids, access_token):
    """
    获取Spotify歌曲的audio features
    
    参数:
        track_ids: 歌曲ID列表或单个歌曲ID字符串
        access_token: Spotify API的access token
    
    返回:
        包含audio features的字典
    """
    # 处理单个ID的情况
    if isinstance(track_ids, str):
        track_ids = [track_ids]
    
    # 将ID列表用逗号连接
    ids_param = ','.join(track_ids)
    
    # 设置请求URL和headers
    url = f'https://api.spotify.com/v1/audio-features'
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    params = {
        'ids': ids_param
    }
    
    # 发送GET请求
    response = requests.get(url, headers=headers, params=params)
    
    # 检查响应状态
    if response.status_code == 200:
        return response.json()
    else:
        print(f"请求失败，状态码: {response.status_code}")
        print(f"错误信息: {response.text}")
        return None


def print_audio_features(data):
    """格式化打印audio features"""
    if data and 'audio_features' in data:
        for feature in data['audio_features']:
            if feature:
                print(f"\n{'='*50}")
                print(f"歌曲ID: {feature.get('id')}")
                print(f"URI: {feature.get('uri')}")
                print(f"-"*50)
                print(f"  声学度 (Acousticness): {feature.get('acousticness')}")
                print(f"  可舞性 (Danceability): {feature.get('danceability')}")
                print(f"  能量 (Energy): {feature.get('energy')}")
                print(f"  乐器性 (Instrumentalness): {feature.get('instrumentalness')}")
                print(f"  活跃度 (Liveness): {feature.get('liveness')}")
                print(f"  语音度 (Speechiness): {feature.get('speechiness')}")
                print(f"  情绪值 (Valence): {feature.get('valence')}")
                print(f"  调性 (Key): {feature.get('key')}")
                print(f"  调式 (Mode): {'大调' if feature.get('mode') == 1 else '小调'}")
                print(f"  速度 (Tempo): {feature.get('tempo')} BPM")
                print(f"  拍号 (Time Signature): {feature.get('time_signature')}/4")
                print(f"  时长 (Duration): {feature.get('duration_ms')} ms")
                print(f"  响度 (Loudness): {feature.get('loudness')} dB")
                print(f"  分析链接: {feature.get('analysis_url')}")
    else:
        print("没有获取到数据")


# ============ 使用示例 ============

if __name__ == "__main__":
    # 检查环境变量
    if not ACCESS_TOKEN:
        print("❌ 错误: 请设置环境变量 SPOTIFY_ACCESS_TOKEN")
        print("\n在 .env 文件中添加:")
        print("  SPOTIFY_ACCESS_TOKEN=your_access_token_here")
        exit(1)
    
    # 示例歌曲ID列表
    track_ids = [
        "7ouMYWpwJ422jRcDASZB7P",
        "4VqPOruhp5EdPBeR92t6lQ", 
        "2takcwOaAZWiXQijPHIx7B"
    ]
    
    print("="*60)
    print("Spotify Audio Features 获取工具")
    print("="*60)
    
    # 获取audio features
    result = get_audio_features(track_ids, ACCESS_TOKEN)
    
    # 打印结果
    if result:
        print_audio_features(result)
        
        # 也可以保存为JSON文件
        with open('audio_features.json', 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"\n数据已保存到 audio_features.json")
