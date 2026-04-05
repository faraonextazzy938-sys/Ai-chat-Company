from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from database import db, User
from datetime import datetime
from functools import wraps
import secrets, os, re, requests

app = Flask(__name__, static_folder='.')
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE']   = os.environ.get('RAILWAY_ENVIRONMENT') == 'production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///aichat.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app, supports_credentials=True, origins=os.environ.get('ALLOWED_ORIGINS', '*').split(','))
db.init_app(app)

NOMCHAT_URL = os.environ.get('NOMCHAT_URL', 'https://nomchat-id.up.railway.app')
NOMCHAT_APP_ID = 'ai-chat-pro'

# Rate limiting
_rate = {}
def rate_limit(key, max_calls=5, window=60):
    now = datetime.utcnow().timestamp()
    calls = [t for t in _rate.get(key, []) if now - t < window]
    if len(calls) >= max_calls: return False
    calls.append(now); _rate[key] = calls; return True

with app.app_context():
    db.create_all()

# ── Decorators ────────────────────────────────────────────────

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

# ── Static ────────────────────────────────────────────────────

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

@app.errorhandler(404)
def not_found(e):
    return send_from_directory('.', '404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return send_from_directory('.', '404.html'), 500

# ── Auth: Register ────────────────────────────────────────────

@app.route('/api/auth/register', methods=['POST'])
def register():
    ip = request.remote_addr
    if not rate_limit(f'reg:{ip}', max_calls=5, window=300):
        return jsonify({'error': 'Too many requests'}), 429

    data     = request.get_json(silent=True) or {}
    email    = data.get('email', '').strip().lower()
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not email or not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
        return jsonify({'error': 'Invalid email'}), 400
    if not username or len(username) < 2 or len(username) > 50:
        return jsonify({'error': 'Username must be 2–50 characters'}), 400
    if not password or len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400

    user = User(
        email=email,
        username=username,
        password_hash=User.hash_password(password),
        last_login=datetime.utcnow()
    )
    db.session.add(user)
    db.session.commit()

    session.clear()
    session['user_id'] = user.id
    session.permanent = True
    return jsonify({'success': True, 'user': user.to_dict()})

# ── Auth: Login ───────────────────────────────────────────────

@app.route('/api/auth/login', methods=['POST'])
def login():
    ip = request.remote_addr
    if not rate_limit(f'login:{ip}', max_calls=10, window=300):
        return jsonify({'error': 'Too many attempts'}), 429

    data     = request.get_json(silent=True) or {}
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.password_hash or not user.verify_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    if user.is_banned:
        return jsonify({'error': 'banned', 'reason': 'Account banned'}), 403

    user.last_login = datetime.utcnow()
    db.session.commit()

    session.clear()
    session['user_id'] = user.id
    session.permanent = True
    return jsonify({'success': True, 'user': user.to_dict()})

# ── Auth: Nomchat OAuth ───────────────────────────────────────

@app.route('/api/auth/nomchat', methods=['POST'])
def nomchat_auth():
    data  = request.get_json(silent=True) or {}
    token = data.get('token', '')
    if not token:
        return jsonify({'error': 'Token required'}), 400

    try:
        res = requests.post(
            f'{NOMCHAT_URL}/api/auth/token/verify',
            json={'token': token, 'app_id': NOMCHAT_APP_ID},
            timeout=5
        )
        nc_data = res.json()
    except Exception as e:
        return jsonify({'error': f'Nomchat unreachable: {e}'}), 503

    if not res.ok or not nc_data.get('success'):
        return jsonify({'error': nc_data.get('error', 'Invalid token')}), 401

    nc_user = nc_data['user']
    email   = nc_user['email']

    # Find or create user
    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(
            email=email,
            username=nc_user['username'],
            nomchat_id=nc_user['id'],
            nomchat_username=nc_user['username'],
            nomchat_avatar=nc_user.get('avatar', '💬')
        )
        db.session.add(user)
    else:
        user.nomchat_id       = nc_user['id']
        user.nomchat_username = nc_user['username']
        user.nomchat_avatar   = nc_user.get('avatar', '💬')

    if user.is_banned:
        return jsonify({'error': 'banned'}), 403

    user.last_login = datetime.utcnow()
    db.session.commit()

    session.clear()
    session['user_id'] = user.id
    session.permanent = True
    return jsonify({'success': True, 'user': user.to_dict()})

# ── Auth: Me / Logout ─────────────────────────────────────────

@app.route('/api/auth/me')
@login_required
def me(user):
    return jsonify(user.to_dict())

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

# ── User: Update ──────────────────────────────────────────────

@app.route('/api/user/update', methods=['POST'])
@login_required
def update_user(user):
    data = request.get_json(silent=True) or {}
    if 'username' in data:
        name = data['username'].strip()
        if 2 <= len(name) <= 50:
            user.username = name
    if 'password' in data and len(data['password']) >= 6:
        user.password_hash = User.hash_password(data['password'])
    db.session.commit()
    return jsonify(user.to_dict())

@app.route('/api/config/groq-key')
def get_groq_key():
    key = os.environ.get('GROQ_API') or os.environ.get('GROQ_KEY', '')
    if not key:
        return jsonify({'error': 'GROQ key not configured'}), 503
    return jsonify({'key': key})

@app.route('/api/chat', methods=['POST'])
def proxy_chat():
    """Proxy chat requests — supports text and vision"""
    key = os.environ.get('GROQ_API') or os.environ.get('GROQ_KEY', '')
    if not key:
        return jsonify({'error': 'Service not configured'}), 503
    try:
        data = request.get_json(silent=True) or {}
        stream = data.get('stream', False)

        # Check if any message has image content — use vision model
        has_image = any(
            isinstance(m.get('content'), list) and
            any(c.get('type') == 'image_url' for c in m['content'])
            for m in data.get('messages', [])
        )

        # Use vision-capable model if image present
        if has_image:
            data['model'] = 'meta-llama/llama-4-scout-17b-16e-instruct'
            data['stream'] = False  # vision doesn't support streaming on groq yet
            stream = False

        resp = requests.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
            json=data,
            timeout=60,
            stream=stream
        )

        if stream:
            def generate():
                for chunk in resp.iter_content(chunk_size=None):
                    if chunk:
                        yield chunk
            return app.response_class(generate(), status=resp.status_code,
                                      content_type='text/event-stream')
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@login_required
def delete_user(user):
    db.session.delete(user)
    db.session.commit()
    session.clear()
    return jsonify({'success': True})

# ── Desktop Auth ──────────────────────────────────────────────

_desktop_tokens = {}  # state -> {token, user_id, expires}

@app.route('/api/auth/desktop/issue', methods=['POST'])
@login_required
def desktop_issue(user):
    """Issue a one-time token for desktop app after user confirms"""
    data  = request.get_json(silent=True) or {}
    state = data.get('state', '')
    if not state:
        return jsonify({'error': 'State required'}), 400

    token   = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(minutes=5)
    _desktop_tokens[state] = {
        'token':   token,
        'user_id': user.id,
        'expires': expires
    }
    return jsonify({'token': token, 'state': state})

@app.route('/api/auth/desktop/verify', methods=['POST'])
def desktop_verify():
    """Desktop app verifies the token it received"""
    data  = request.get_json(silent=True) or {}
    token = data.get('token', '')
    if not token:
        return jsonify({'error': 'Token required'}), 400

    # Find by token
    entry = None
    state_key = None
    for k, v in list(_desktop_tokens.items()):
        if v['token'] == token:
            entry = v; state_key = k; break

    if not entry:
        return jsonify({'error': 'Invalid token'}), 401
    if entry['expires'] < datetime.utcnow():
        del _desktop_tokens[state_key]
        return jsonify({'error': 'Token expired'}), 401

    user = User.query.get(entry['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404

    del _desktop_tokens[state_key]
    return jsonify({'success': True, 'user': user.to_dict()})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
