import requests
import sqlite3

# Discogs API访问令牌
DISCOGS_TOKEN = 'JlrCLpsKmGLhZBYmUSZlArryqDQySTOmMzZtRqvn'

# 数据库连接
conn = sqlite3.connect('albums.db')  # 根据实际的数据库名称进行修改
cursor = conn.cursor()

# 确保数据库表有适当的列来存储从Discogs获取的信息
# 假设已经有year和genre列
# cursor.execute("ALTER TABLE albums ADD COLUMN year TEXT")
# cursor.execute("ALTER TABLE albums ADD COLUMN genre TEXT")

# 从数据库中获取专辑列表
cursor.execute("SELECT id, title, artist FROM album")
albums = cursor.fetchall()

# 查询Discogs API并更新数据库
for album in albums:
    album_id, title, artist = album
    query = f"{title} {artist}"
    url = f"https://api.discogs.com/database/search?q={query}&token={DISCOGS_TOKEN}"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        if data['results']:
            # 获取第一个结果
            discogs_data = data['results'][0]
            discogs_year = discogs_data.get('year', '')
            discogs_genre = ', '.join(discogs_data.get('genre', []))

            # 更新数据库
            cursor.execute("""
                UPDATE album
                SET release_date = ?, genre = ?
                WHERE id = ?
            """, (discogs_year, discogs_genre, album_id))
            conn.commit()
        else:
            print(f"No results found for {query}")
    else:
        print(f"Error fetching data for {query}: {response.status_code}")

# 关闭数据库连接
conn.close()
