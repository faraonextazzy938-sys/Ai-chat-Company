from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id         = db.Column(db.Integer, primary_key=True)
    email      = db.Column(db.String(255), unique=True, nullable=False)
    username   = db.Column(db.String(100), nullable=False)
    avatar     = db.Column(db.String(50), default='skull')
    is_admin   = db.Column(db.Boolean, default=False)
    is_dev     = db.Column(db.Boolean, default=False)
    is_creator = db.Column(db.Boolean, default=False)
    is_support = db.Column(db.Boolean, default=False)
    is_banned  = db.Column(db.Boolean, default=False)
    ban_reason = db.Column(db.String(500), nullable=True)
    banned_by  = db.Column(db.String(255), nullable=True)
    banned_at  = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    def to_dict(self):
        return {
            'id':         self.id,
            'email':      self.email,
            'username':   self.username,
            'avatar':     self.avatar,
            'is_admin':   self.is_admin,
            'is_dev':     self.is_dev,
            'is_creator': self.is_creator,
            'is_support': self.is_support,
            'is_banned':  self.is_banned,
            'ban_reason': self.ban_reason,
            'banned_by':  self.banned_by,
            'banned_at':  self.banned_at.isoformat() if self.banned_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
        }

class VerificationCode(db.Model):
    __tablename__ = 'verification_codes'

    id         = db.Column(db.Integer, primary_key=True)
    email      = db.Column(db.String(255), nullable=False)
    code       = db.Column(db.String(6), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class AppToken(db.Model):
    """Временные токены для авторизации внешних приложений через Nomchat ID"""
    __tablename__ = 'app_tokens'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    app_id     = db.Column(db.String(100), nullable=False)
    token      = db.Column(db.String(64), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('app_tokens', cascade='all, delete-orphan'))


class Report(db.Model):
    __tablename__ = 'reports'

    id          = db.Column(db.Integer, primary_key=True)
    reporter_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    reporter_email = db.Column(db.String(255), nullable=False)
    subject     = db.Column(db.String(200), nullable=False)
    category    = db.Column(db.String(50), default='general')  # bug, abuse, ban_appeal, general
    message     = db.Column(db.Text, nullable=False)
    status      = db.Column(db.String(20), default='open')  # open, in_progress, resolved, closed
    response    = db.Column(db.Text, nullable=True)
    resolved_by = db.Column(db.String(255), nullable=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, default=datetime.utcnow)

    reporter = db.relationship('User', foreign_keys=[reporter_id])

    def to_dict(self):
        return {
            'id':             self.id,
            'reporter_email': self.reporter_email,
            'subject':        self.subject,
            'category':       self.category,
            'message':        self.message,
            'status':         self.status,
            'response':       self.response,
            'resolved_by':    self.resolved_by,
            'created_at':     self.created_at.isoformat() if self.created_at else None,
            'updated_at':     self.updated_at.isoformat() if self.updated_at else None,
        }
