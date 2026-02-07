import requests

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

# 搜索专辑ID
album_name = 'JESUS IS KING'
artist_name = 'Kanye West'
search_result = search_album_by_name_and_artist(album_name, artist_name)

# 提取专辑ID
if search_result['release-groups']:
    album_id = search_result['release-groups'][0]['id']
    album_info = get_album_genres(album_id)

    # 提取并打印流派信息
    if 'tags' in album_info:
        genres = [tag['name'] for tag in album_info['tags']]
        print(f"Genres: {', '.join(genres)}")
    else:
        print("No genres found for this album.")
else:
    print("Album not found.")
