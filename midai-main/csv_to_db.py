import pandas as pd
import sqlite3
import os

# 获取当前工作目录
BASE_DIR = os.getcwd()

# 读取CSV文件并指定编码
csv_file_path = 'albums_info_updated.csv'

try:
    # 尝试使用UTF-8编码读取CSV文件
    albums_df = pd.read_csv(csv_file_path, encoding='utf-8')
except UnicodeDecodeError:
    # 如果失败，使用ISO-8859-1编码读取CSV文件，并重新保存为UTF-8编码
    albums_df = pd.read_csv(csv_file_path, encoding='ISO-8859-1')
    utf8_csv_file_path = 'albums_info_utf8.csv'
    albums_df.to_csv(utf8_csv_file_path, index=False, encoding='utf-8')
    # 重新使用UTF-8编码读取CSV文件
    albums_df = pd.read_csv(utf8_csv_file_path, encoding='utf-8')

# 确保所有字符串列都是字符串类型，避免潜在的编码问题
for col in albums_df.select_dtypes(include=['object']).columns:
    albums_df[col] = albums_df[col].astype(str)

# 移除ID列，以确保数据库自动生成
if 'id' in albums_df.columns:
    albums_df = albums_df.drop(columns=['id'])

# 创建SQLite数据库连接
db_path = os.path.join(BASE_DIR, 'albums.db')
conn = sqlite3.connect(db_path)

# 设置SQLite连接以处理UTF-8编码
conn.text_factory = str

# 创建表结构
conn.execute('''
CREATE TABLE IF NOT EXISTS album (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    release_date TEXT,
    genre TEXT,
    length TEXT,
    label TEXT
)
''')

# 将DataFrame写入SQLite数据库
albums_df.to_sql('album', conn, if_exists='append', index=False)

# 关闭数据库连接
conn.close()

print("CSV data has been successfully converted to SQLite database!")
