import pandas as pd
import musicbrainzngs

# 设置MusicBrainz用户代理
musicbrainzngs.set_useragent("album_date_filler", "0.1", "justwangmeng@outlook.com")

# 读取CSV文件
csv_file_path = 'albums_info_updated.csv'  # 更新为你本地的文件路径
albums_df = pd.read_csv(csv_file_path, encoding='ISO-8859-1')

def get_release_date(artist, title):
    try:
        result = musicbrainzngs.search_releases(artist=artist, release=title, limit=1)
        if result['release-list']:
            release = result['release-list'][0]
            return release.get('date', None)
    except Exception as e:
        print(f"Error retrieving date for {artist} - {title}: {e}")
    return None

# 将发行日期列转换为字符串
albums_df['release_date'] = albums_df['release_date'].astype(str)

# 查找并更新每个专辑的发行日期
for index, row in albums_df.iterrows():
    if len(row['release_date']) == 4:  # 只有年份的日期
        full_date = get_release_date(row['artist'], row['title'])
        if full_date:
            albums_df.at[index, 'release_date'] = full_date

# 保存更新后的CSV文件
updated_csv_file_path = 'albums_info_with_full_date.csv'  # 更新为你想保存的文件路径
albums_df.to_csv(updated_csv_file_path, index=False, encoding='ISO-8859-1')

print("CSV data has been successfully updated and saved!")
