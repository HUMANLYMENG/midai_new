from app import db

class Album(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(128), nullable=False)
    artist = db.Column(db.String(128), nullable=False)
    release_date = db.Column(db.String(64))
    genre = db.Column(db.String(64))
    length = db.Column(db.String(64)) # Duration of the album
    label = db.Column(db.String(128)) # Record label
    tag = db.Column(db.String(128)) # Comma-separated tags
    comment = db.Column(db.Text) # Additional comments
    cover = db.Column(db.String(200))  # URL or file path to the cover image

    # 定义唯一性约束
    __table_args__ = (
        db.UniqueConstraint('artist', 'title', name='_artist_title_uc'),
    )
    
    def __repr__(self):
        return f'<Album {self.id}: {self.title} by {self.artist}>'
