from flask import Flask, request, redirect, url_for, render_template, jsonify
import pandas as pd
import os
from flask_sqlalchemy import SQLAlchemy
from app import create_app, db
from app.models import Album
from sqlalchemy.dialects.sqlite import insert
import logging
from sqlalchemy.exc import IntegrityError

# 配置日志记录
logging.basicConfig(
    filename='run.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filemode='w'  # 使用 'w' 模式来清空日志文件
)


def init_app(app):
    @app.route('/')
    def home():
        return render_template('home.html')

    @app.route('/collection')
    def collection():
        albums = Album.query.all()
        # print(albums)  # 打印到控制台以便调试
        return render_template('collection.html', albums=albums)

    @app.route('/add', methods=['GET', 'POST'])
    def add_album():
        if request.method == 'POST':
            if 'file' in request.files:  # 如果请求中包含文件
                file = request.files['file']
                if file.filename.endswith('.csv'):
                    file_path = os.path.join('/tmp', file.filename)
                    file.save(file_path)
                    try:
                        albums_df = pd.read_csv(file_path, encoding='utf-8')  # 尝试使用 utf-8 编码读取文件
                    except UnicodeDecodeError:
                        albums_df = pd.read_csv(file_path, encoding='ISO-8859-1')  # 如果失败，使用 ISO-8859-1 编码读取文件


                    for _, row in albums_df.iterrows():
                        stmt = insert(Album).values(
                            title=row.get('title', ''),
                            artist=row.get('artist', ''),
                            release_date=row.get('release_date', None),
                            genre=row.get('genre', ''),
                            length=row.get('length', ''),
                            label=row.get('label', ''),
                            tag=row.get('tag', ''),
                            comment=row.get('comment', ''),
                            cover=row.get('cover', '')
                        )
                        # 使用 `on_conflict_do_nothing` 来忽略冲突
                        stmt = stmt.on_conflict_do_nothing(index_elements=['artist', 'title'])
                        
                        try:
                            db.session.execute(stmt)
                            db.session.commit()  # 提交事务
                            logging.info("Successfully inserted album: %s by artist: %s", row.get('title', ''), row.get('artist', ''))
                        except IntegrityError as e:
                            db.session.rollback()  # 回滚事务
                            logging.error("Conflict detected for album: %s by artist: %s", row.get('title', ''), row.get('artist', ''))
                            logging.error("Error details: %s", str(e))  # 记录详细错误信息
                        except Exception as e:
                            logging.error("Unexpected error: %s", str(e))  # 记录其他可能的错误
                            
                    return redirect(url_for('collection'))
                else:
                    return "Unsupported file format", 400
            else:  # 处理直接输入的表单
                title = request.form['title']
                artist = request.form['artist']
                release_date = request.form['release_date']
                genre = request.form['genre']
                length = request.form['length']
                label = request.form['label']
                tag = request.form['tag']
                comment = request.form['comment']
                cover = request.form['cover']
                

                new_album = Album(title=title, artist=artist, release_date=release_date, genre=genre, length=length, label=label, tag=tag, comment=comment, cover=cover)
                db.session.add(new_album)
                db.session.commit()

                return redirect(url_for('collection'))

        return render_template('add_album.html')

    @app.route('/api/albums', methods=['GET'])
    def get_albums():
        albums = Album.query.all()
        album_list = [
            {
                'id': album.id,
                'title': album.title,
                'artist': album.artist,
                'release_date': album.release_date,
                'genre': album.genre,
                'length': album.length,
                'label': album.label,
                'tag' : album.tag,
                'comment': album.comment,
                'cover': album.cover
            } for album in albums
        ]
        return jsonify(album_list)

    @app.route('/api/album/<int:album_id>', methods=['GET'])
    def get_album(album_id):
        album = Album.query.get(album_id)
        if album:
            return jsonify({
                'id': album.id,
                'title': album.title,
                'artist': album.artist,
                'release_date': album.release_date,
                'genre': album.genre,
                'length': album.length,
                'label': album.label,
                'tag' : album.tag,
                'comment': album.comment,
                'cover': album.cover
            })
        return jsonify({'error': 'Album not found'}), 404

    @app.route('/api/album/<int:album_id>', methods=['PUT'])
    def update_album(album_id):
        album = Album.query.get(album_id)
        if album:
            data = request.json
            album.title = data['title']
            album.artist = data['artist']
            album.release_date = data['release_date']
            album.genre = data['genre']
            album.length = data['length']
            album.label = data['label']
            album.tag = data['tag']
            album.comment = data['comment']
            album.cover = data['cover']
            db.session.commit()
            return jsonify({'message': 'Album updated successfully'})
        return jsonify({'error': 'Album not found'}), 404
    
    @app.route('/api/album/<int:album_id>', methods=['DELETE'])
    def delete_album(album_id):
        album = Album.query.get_or_404(album_id)
        db.session.delete(album)
        db.session.commit()
        return jsonify({'message': 'Album deleted successfully'}), 200

    @app.route('/api/albums_sort', methods=['GET'])
    def get_albums_sort():
        album_id = request.args.get('album_id')
        sort_option = request.args.get('sort')

        if album_id:
            album = Album.query.get(album_id)
            if album:
                return jsonify({
                    'id': album.id,
                    'title': album.title,
                    'artist': album.artist,
                    'release_date': album.release_date,
                    'genre': album.genre,
                    'length': album.length,
                    'label': album.label,
                    'tag' : album.tag,
                    'comment': album.comment,
                    'cover': album.cover
                })
            return jsonify({'error': 'Album not found'}), 404
        elif sort_option:
            if sort_option == 'alphabet':
                albums = Album.query.order_by(Album.title).all()
            elif sort_option == 'genre':
                albums = Album.query.order_by(Album.genre).all()
            elif sort_option == 'artist':
                albums = Album.query.order_by(Album.artist).all()
            elif sort_option == 'label':
                albums = Album.query.order_by(Album.label).all()
            else:
                albums = Album.query.all()

            album_list = [{'id': album.id, 'title': album.title, 'artist': album.artist} for album in albums]
            return jsonify(album_list)
        else:
            return jsonify({'error': 'No sorting option or album ID provided'}), 400

    if __name__ == '__main__':
        app.run(debug=True)