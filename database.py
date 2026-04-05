from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import hashlib, os

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id           = db.Column(db.Integer, primary_key=True)
    email        = db.Column(db.String(255), unique=True, nullable=False)
    username     = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(128), nullable=True)  # None if Nomchat-only
    nomchat_id   = db.Column(db.Integer, nullable=True)
    nomchat_username = db.Column(db.String(100), nullable=True)
    nomchat_avatar   = db.Column(db.String(50), nullable=True)
    is_banned    = db.Column(db.Boolean, default=False)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
    last_login   = db.Column(db.DateTime)

    @staticmethod
    def hash_password(password: str) -> str:
        salt = os.environ.get('PASSWORD_SALT', 'aichat_salt_2026')
        return hashlib.sha256(f'{salt}{password}'.encode()).hexdigest()

    def verify_password(self, password: str) -> bool:
        return self.password_hash == self.hash_password(password)

    def to_dict(self):
        return {
            'id':               self.id,
            'email':            self.email,
            'username':         self.username,
            'nomchat_id':       self.nomchat_id,
            'nomchat_username': self.nomchat_username,
            'nomchat_avatar':   self.nomchat_avatar,
            'has_password':     self.password_hash is not None,
            'created_at':       self.created_at.isoformat() if self.created_at else None,
            'last_login':       self.last_login.isoformat() if self.last_login else None,
        }
