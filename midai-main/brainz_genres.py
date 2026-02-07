import requests
import sqlite3

def search_album_by_name_and_artist(album_name, artist_name):
    url = 'https://musicbrainz.org/ws/2/release-group/'
    params = {
        'query': f'release:{album_name} AND artist:{artist_name}',
        'fmt': 'json',
        'limit': 1
    }
    response = requests.get(url, params=params)
    return response.json()

def get_album_genres(album_id):
    url = f'https://musicbrainz.org/ws/2/release-group/{album_id}'
    params = {
        'inc': 'tags',  # 包含标签信息
        'fmt': 'json'
    }
    response = requests.get(url, params=params)
    return response.json()

def update_genres_in_db(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT id, title, artist FROM album")
    albums = cursor.fetchall()

    for album in albums:
        album_id, title, artist = album
        search_result = search_album_by_name_and_artist(title, artist)

        if search_result['release-groups']:
            musicbrainz_id = search_result['release-groups'][0]['id']
            album_info = get_album_genres(musicbrainz_id)

            if 'tags' in album_info:
                genres = [tag['name'] for tag in album_info['tags']]
                genre_str = ', '.join(genres)
            else:
                genre_str = 'Unknown'

            cursor.execute("UPDATE album SET genre = ? WHERE id = ?", (genre_str, album_id))
            conn.commit()
            print(f"Updated album '{title}' by '{artist}' with genres: {genre_str}")
        else:
            print(f"Album '{title}' by '{artist}' not found in MusicBrainz.")

    conn.close()

# 更新数据库中的流派信息
db_path = 'albums.db'  # 替换为实际数据库文件的路径
update_genres_in_db(db_path)
