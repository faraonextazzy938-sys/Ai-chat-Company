from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from functools import wraps
import os, secrets, requests, traceback
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder='.')
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('RAILWAY_ENVIRONMENT') == 'production'

db_url = os.environ.get('DATABASE_URL', 'sqlite:///aichat.db')
if db_url.startswith('postgres://'):
    db_url = db_url.replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {'pool_pre_ping': True, 'pool_recycle': 300}

CORS(app, supports_credentials=True, origins='*')
db = SQLAlchemy(app)

GROQ_KEY = lambda: os.environ.get('GROQ_API') or os.environ.get('GROQ_KEY', '')
NOMCHAT_URL = os.environ.get('NOMCHAT_URL', 'https://nomchat-id.up.railway.app')

# ── Models ────────────────────────────────────────────────────

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    username = db.Column(db.String(80), nullable=False)
    password_hash = db.Column(db.String(256))
    nomchat_id = db.Column(db.String(64))
    nomchat_username = db.Column(db.String(80))
    nomchat_avatar = db.Column(db.String(10), default='💬')
    credits = db.Column(db.Integer, default=50)
    bonus_credits = db.Column(db.Integer, default=300)
    plan = db.Column(db.String(20), default='free')
    is_banned = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

    def set_password(self, pw): self.password_hash = generate_password_hash(pw)
    def check_password(self, pw): return self.password_hash and check_password_hash(self.password_hash, pw)

    def to_dict(self):
        total = -1 if self.plan == 'ultra' else (self.credits or 0) + (self.bonus_credits or 0)
        return {
            'id': self.id, 'email': self.email, 'username': self.username,
            'credits': self.credits or 0, 'bonus_credits': self.bonus_credits or 0,
            'total_credits': total, 'plan': self.plan or 'free',
            'nomchat_id': self.nomchat_id, 'nomchat_username': self.nomchat_username,
            'nomchat_avatar': self.nomchat_avatar or '💬',
            'has_password': bool(self.password_hash),
        }

with app.app_context():
    db.create_all()

# ── Auth helpers ──────────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        uid = session.get('user_id')
        if not uid: return jsonify({'error': 'Unauthorized'}), 401
        user = User.query.get(uid)
        if not user: session.clear(); return jsonify({'error': 'Unauthorized'}), 401
        if user.is_banned: return jsonify({'error': 'banned'}), 403
        return f(*args, user=user, **kwargs)
    return decorated

def deduct(user):
    if user.plan == 'ultra': return
    if (user.bonus_credits or 0) > 0: user.bonus_credits -= 1
    elif (user.credits or 0) > 0: user.credits -= 1
    db.session.commit()

# ── Static ────────────────────────────────────────────────────

@app.route('/')
def index(): return send_from_directory('.', 'index.html')

@app.route('/<path:f>')
def static_files(f):
    try: return send_from_directory('.', f)
    except: return jsonify({'error': 'Not found'}), 404

@app.errorhandler(404)
def not_found(e):
    try: return send_from_directory('.', '404.html'), 404
    except: return jsonify({'error': 'Not found'}), 404

# ── Auth ──────────────────────────────────────────────────────

@app.route('/api/auth/register', methods=['POST'])
def register():
    d = request.get_json(silent=True) or {}
    email = d.get('email', '').strip().lower()
    username = d.get('username', '').strip()
    password = d.get('password', '')
    if not email or not username or not password:
        return jsonify({'error': 'All fields required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password too short'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
    user = User(email=email, username=username, last_login=datetime.utcnow())
    user.set_password(password)
    db.session.add(user); db.session.commit()
    session['user_id'] = user.id
    return jsonify({'success': True, 'user': user.to_dict()})

@app.route('/api/auth/login', methods=['POST'])
def login():
    d = request.get_json(silent=True) or {}
    email = d.get('email', '').strip().lower()
    password = d.get('password', '')
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401
    if user.is_banned: return jsonify({'error': 'banned'}), 403
    user.last_login = datetime.utcnow(); db.session.commit()
    session['user_id'] = user.id
    return jsonify({'success': True, 'user': user.to_dict()})

@app.route('/api/auth/nomchat', methods=['POST'])
def nomchat_auth():
    d = request.get_json(silent=True) or {}
    token = d.get('token', '')
    if not token: return jsonify({'error': 'Token required'}), 400
    try:
        res = requests.post(f'{NOMCHAT_URL}/api/auth/token/verify',
                            json={'token': token, 'app_id': 'ai-chat-pro'}, timeout=5)
        nc = res.json()
    except Exception as e:
        return jsonify({'error': f'Nomchat unreachable: {e}'}), 503
    if not res.ok or not nc.get('success'):
        return jsonify({'error': nc.get('error', 'Invalid token')}), 401
    nc_user = nc['user']
    user = User.query.filter_by(email=nc_user['email']).first()
    if not user:
        user = User(email=nc_user['email'], username=nc_user['username'],
                    nomchat_id=nc_user['id'], nomchat_username=nc_user['username'],
                    nomchat_avatar=nc_user.get('avatar', '💬'))
        db.session.add(user)
    else:
        user.nomchat_id = nc_user['id']
        user.nomchat_username = nc_user['username']
        user.nomchat_avatar = nc_user.get('avatar', '💬')
    if user.is_banned: return jsonify({'error': 'banned'}), 403
    user.last_login = datetime.utcnow(); db.session.commit()
    session['user_id'] = user.id
    return jsonify({'success': True, 'user': user.to_dict()})

@app.route('/api/auth/me')
@login_required
def me(user): return jsonify(user.to_dict())

@app.route('/api/auth/logout', methods=['POST'])
def logout(): session.clear(); return jsonify({'success': True})

# ── Config ────────────────────────────────────────────────────

@app.route('/api/config/groq-key')
def get_groq_key():
    key = GROQ_KEY()
    if not key: return jsonify({'error': 'Not configured'}), 503
    return jsonify({'key': key})

# ── Chat ──────────────────────────────────────────────────────

@app.route('/api/chat', methods=['POST'])
@login_required
def chat(user):
    if user.plan != 'ultra' and (user.credits or 0) + (user.bonus_credits or 0) <= 0:
        return jsonify({'error': 'no_credits'}), 402

    d = request.get_json(silent=True) or {}
    messages = d.get('messages', [])
    model = d.get('model', 'llama-3.3-70b-versatile')

    key = GROQ_KEY()
    if not key:
        return jsonify({'error': 'AI not configured'}), 503

    try:
        groq_msgs = [m for m in messages if isinstance(m.get('content'), str)]
        r = requests.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
            json={'model': model, 'messages': groq_msgs, 'max_tokens': 2048, 'temperature': 0.9},
            timeout=30
        )
        if r.ok:
            text = r.json()['choices'][0]['message']['content']
            deduct(user)
            total = -1 if user.plan == 'ultra' else (user.credits or 0) + (user.bonus_credits or 0)
            return jsonify({'choices': [{'message': {'role': 'assistant', 'content': text}}],
                            'credits_remaining': total})
        else:
            return jsonify({'error': f'Groq error: {r.status_code}', 'detail': r.text}), 502
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── User ──────────────────────────────────────────────────────

@app.route('/api/user/update', methods=['POST'])
@login_required
def update_user(user):
    d = request.get_json(silent=True) or {}
    if 'username' in d and 2 <= len(d['username'].strip()) <= 50:
        user.username = d['username'].strip()
    if 'password' in d and len(d['password']) >= 6:
        user.set_password(d['password'])
    db.session.commit()
    return jsonify(user.to_dict())

@app.route('/api/user/delete', methods=['DELETE'])
@login_required
def delete_user(user):
    db.session.delete(user); db.session.commit(); session.clear()
    return jsonify({'success': True})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
