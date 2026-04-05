from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from database import db, User, ChatSession, ChatMessage, PLANS
from datetime import datetime, timedelta
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

NOMCHAT_URL    = os.environ.get('NOMCHAT_URL', 'https://nomchat-id.up.railway.app')
NOMCHAT_APP_ID = 'ai-chat-pro'
OPERATOR_EMAIL = os.environ.get('OPERATOR_EMAIL', 'ai@com.ru')

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

def operator_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        uid = session.get('user_id')
        if not uid: return jsonify({'error': 'Unauthorized'}), 401
        user = User.query.get(uid)
        if not user or user.email != OPERATOR_EMAIL:
            return jsonify({'error': 'Forbidden'}), 403
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
        email=email, username=username,
        password_hash=User.hash_password(password),
        last_login=datetime.utcnow(),
        plan='free', credits=50, bonus_credits=300
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
    if not token: return jsonify({'error': 'Token required'}), 400

    try:
        res = requests.post(f'{NOMCHAT_URL}/api/auth/token/verify',
                            json={'token': token, 'app_id': NOMCHAT_APP_ID}, timeout=5)
        nc_data = res.json()
    except Exception as e:
        return jsonify({'error': f'Nomchat unreachable: {e}'}), 503

    if not res.ok or not nc_data.get('success'):
        return jsonify({'error': nc_data.get('error', 'Invalid token')}), 401

    nc_user = nc_data['user']
    email   = nc_user['email']
    user    = User.query.filter_by(email=email).first()
    if not user:
        user = User(email=email, username=nc_user['username'],
                    nomchat_id=nc_user['id'], nomchat_username=nc_user['username'],
                    nomchat_avatar=nc_user.get('avatar', '💬'),
                    plan='free', credits=50, bonus_credits=300)
        db.session.add(user)
    else:
        user.nomchat_id       = nc_user['id']
        user.nomchat_username = nc_user['username']
        user.nomchat_avatar   = nc_user.get('avatar', '💬')

    if user.is_banned: return jsonify({'error': 'banned'}), 403
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

# ── User: Update / Delete ─────────────────────────────────────

@app.route('/api/user/update', methods=['POST'])
@login_required
def update_user(user):
    data = request.get_json(silent=True) or {}
    if 'username' in data:
        name = data['username'].strip()
        if 2 <= len(name) <= 50: user.username = name
    if 'password' in data and len(data['password']) >= 6:
        user.password_hash = User.hash_password(data['password'])
    db.session.commit()
    return jsonify(user.to_dict())

@app.route('/api/user/delete', methods=['DELETE'])
@login_required
def delete_user(user):
    db.session.delete(user)
    db.session.commit()
    session.clear()
    return jsonify({'success': True})

# ── Plans ─────────────────────────────────────────────────────

@app.route('/api/plans')
def get_plans():
    return jsonify(PLANS)

@app.route('/api/plan/upgrade', methods=['POST'])
@login_required
def upgrade_plan(user):
    """Simulate plan upgrade (no real payment — demo)"""
    data = request.get_json(silent=True) or {}
    plan = data.get('plan', '')
    if plan not in PLANS:
        return jsonify({'error': 'Invalid plan'}), 400
    if plan == 'free':
        return jsonify({'error': 'Cannot downgrade to free'}), 400

    cfg = PLANS[plan]
    user.plan    = plan
    user.credits = cfg['credits']  # reset to plan credits
    db.session.commit()
    return jsonify({'success': True, 'user': user.to_dict()})

# ── Chat ──────────────────────────────────────────────────────

@app.route('/api/config/groq-key')
def get_groq_key():
    key = os.environ.get('GROQ_API') or os.environ.get('GROQ_KEY', '')
    if not key: return jsonify({'error': 'GROQ key not configured'}), 503
    return jsonify({'key': key})

@app.route('/api/chat', methods=['POST'])
@login_required
def proxy_chat(user):
    """Proxy chat — requires login, deducts 1 credit (bonus first)"""
    if user.plan != 'ultra' and user.total_credits() <= 0:
        return jsonify({'error': 'no_credits', 'message': 'No credits left.'}), 402

    key = os.environ.get('GROQ_API') or os.environ.get('GROQ_KEY', '')
    if not key: return jsonify({'error': 'Service not configured'}), 503

    try:
        data   = request.get_json(silent=True) or {}
        stream = data.get('stream', False)

        has_image = any(
            isinstance(m.get('content'), list) and
            any(c.get('type') == 'image_url' for c in m['content'])
            for m in data.get('messages', [])
        )
        if has_image:
            data['model'] = 'meta-llama/llama-4-scout-17b-16e-instruct'
            data['stream'] = False
            stream = False

        resp = requests.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
            json=data, timeout=60, stream=stream
        )

        if resp.ok:
            user.deduct_credit()
            db.session.commit()

        if stream:
            def generate():
                for chunk in resp.iter_content(chunk_size=None):
                    if chunk: yield chunk
            return app.response_class(generate(), status=resp.status_code,
                                      content_type='text/event-stream')
        result = resp.json()
        result['credits_remaining'] = user.total_credits()
        return jsonify(result), resp.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── Desktop Auth ──────────────────────────────────────────────

_desktop_tokens = {}

@app.route('/api/auth/desktop/issue', methods=['POST'])
@login_required
def desktop_issue(user):
    data  = request.get_json(silent=True) or {}
    state = data.get('state', '')
    if not state: return jsonify({'error': 'State required'}), 400
    token   = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(minutes=5)
    _desktop_tokens[state] = {'token': token, 'user_id': user.id, 'expires': expires}
    return jsonify({'token': token, 'state': state})

@app.route('/api/auth/desktop/verify', methods=['POST'])
def desktop_verify():
    data  = request.get_json(silent=True) or {}
    token = data.get('token', '')
    if not token: return jsonify({'error': 'Token required'}), 400
    entry = None; state_key = None
    for k, v in list(_desktop_tokens.items()):
        if v['token'] == token: entry = v; state_key = k; break
    if not entry: return jsonify({'error': 'Invalid token'}), 401
    if entry['expires'] < datetime.utcnow():
        del _desktop_tokens[state_key]
        return jsonify({'error': 'Token expired'}), 401
    user = User.query.get(entry['user_id'])
    if not user: return jsonify({'error': 'User not found'}), 404
    del _desktop_tokens[state_key]
    return jsonify({'success': True, 'user': user.to_dict()})

# ── Chat Sessions ─────────────────────────────────────────────

@app.route('/api/session/get', methods=['POST'])
@login_required
def get_or_create_session(user):
    sess = ChatSession.query.filter_by(user_id=user.id).order_by(ChatSession.created_at.desc()).first()
    if not sess:
        sess = ChatSession(user_id=user.id, session_key=secrets.token_urlsafe(24))
        db.session.add(sess); db.session.commit()
    return jsonify(sess.to_dict(include_messages=True))

@app.route('/api/session/message', methods=['POST'])
@login_required
def save_message(user):
    data    = request.get_json(silent=True) or {}
    content = data.get('content', '').strip()
    role    = data.get('role', 'user')
    if not content: return jsonify({'error': 'Empty'}), 400
    if role not in ('user', 'ai'): return jsonify({'error': 'Invalid role'}), 400
    sess = ChatSession.query.filter_by(user_id=user.id).order_by(ChatSession.created_at.desc()).first()
    if not sess:
        sess = ChatSession(user_id=user.id, session_key=secrets.token_urlsafe(24))
        db.session.add(sess); db.session.flush()
    msg = ChatMessage(session_id=sess.id, role=role, content=content)
    db.session.add(msg)
    sess.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'ok': True, 'operator_on': sess.operator_on, 'message': msg.to_dict()})

@app.route('/api/session/poll')
@login_required
def poll_session(user):
    since_id = int(request.args.get('since', 0))
    sess = ChatSession.query.filter_by(user_id=user.id).order_by(ChatSession.created_at.desc()).first()
    if not sess: return jsonify({'operator_on': False, 'messages': []})
    msgs = ChatMessage.query.filter(
        ChatMessage.session_id == sess.id, ChatMessage.id > since_id
    ).order_by(ChatMessage.created_at).all()
    return jsonify({'operator_on': sess.operator_on, 'messages': [m.to_dict() for m in msgs], 'session_id': sess.id})

# ── Operator ──────────────────────────────────────────────────

@app.route('/api/operator/sessions')
@operator_required
def operator_sessions(user):
    sessions = ChatSession.query.order_by(ChatSession.updated_at.desc()).all()
    return jsonify([s.to_dict() for s in sessions])

@app.route('/api/operator/session/<int:sid>')
@operator_required
def operator_get_session(user, sid):
    return jsonify(ChatSession.query.get_or_404(sid).to_dict(include_messages=True))

@app.route('/api/operator/takeover', methods=['POST'])
@operator_required
def operator_takeover(user):
    sid  = (request.get_json(silent=True) or {}).get('session_id')
    sess = ChatSession.query.get_or_404(sid)
    sess.operator_on = True; sess.operator_id = user.id
    db.session.commit()
    return jsonify({'ok': True})

@app.route('/api/operator/release', methods=['POST'])
@operator_required
def operator_release(user):
    sid  = (request.get_json(silent=True) or {}).get('session_id')
    sess = ChatSession.query.get_or_404(sid)
    sess.operator_on = False; sess.operator_id = None
    db.session.commit()
    return jsonify({'ok': True})

@app.route('/api/operator/send', methods=['POST'])
@operator_required
def operator_send(user):
    data    = request.get_json(silent=True) or {}
    sid     = data.get('session_id')
    content = data.get('content', '').strip()
    if not content: return jsonify({'error': 'Empty'}), 400
    sess = ChatSession.query.get_or_404(sid)
    msg  = ChatMessage(session_id=sess.id, role='operator', content=content)
    db.session.add(msg)
    sess.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'ok': True, 'message': msg.to_dict()})

@app.route('/api/operator/poll/<int:sid>')
@operator_required
def operator_poll(user, sid):
    since_id = int(request.args.get('since', 0))
    msgs = ChatMessage.query.filter(
        ChatMessage.session_id == sid, ChatMessage.id > since_id
    ).order_by(ChatMessage.created_at).all()
    return jsonify({'messages': [m.to_dict() for m in msgs]})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
