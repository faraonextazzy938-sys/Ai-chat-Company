from flask import Flask, request, jsonify, session, send_from_directory, abort
from flask_cors import CORS
from database import db, User, VerificationCode, AppToken, Report
from email_service import send_code, send_welcome
from datetime import datetime, timedelta
from functools import wraps
import secrets, os, re

import os

app = Flask(__name__, static_folder='.')
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE']   = os.environ.get('RAILWAY_ENVIRONMENT') == 'production'
CORS(app, supports_credentials=True, origins=os.environ.get('ALLOWED_ORIGINS', '*').split(','))

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///nomchat.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Rate limiting (простой in-memory)//github.com/faraonextazzy938-sys/nomchat-docs.git
git push -u origin master
_rate = {}
def rate_limit(key, max_calls=5, window=60):
    now = datetime.utcnow().timestamp()
    calls = [t for t in _rate.get(key, []) if now - t < window]
    if len(calls) >= max_calls:
        return False
    calls.append(now)
    _rate[key] = calls
    return True

with app.app_context():
    db.create_all()

    # Manual migration — add new columns if they don't exist
    import sqlite3
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'nomchat.db')
    try:
        conn = sqlite3.connect(db_path)
        cur  = conn.cursor()
        existing = [row[1] for row in cur.execute("PRAGMA table_info(users)").fetchall()]
        if 'is_dev' not in existing:
            cur.execute("ALTER TABLE users ADD COLUMN is_dev BOOLEAN DEFAULT 0")
            print('[NOMCHAT] Migration: added is_dev column')
        if 'is_creator' not in existing:
            cur.execute("ALTER TABLE users ADD COLUMN is_creator BOOLEAN DEFAULT 0")
            print('[NOMCHAT] Migration: added is_creator column')
        if 'is_banned' not in existing:
            cur.execute("ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT 0 NOT NULL")
            print('[NOMCHAT] Migration: added is_banned column')
        else:
            # Fix NULL values — set to 0
            cur.execute("UPDATE users SET is_banned = 0 WHERE is_banned IS NULL")
        if 'is_support' not in existing:
            cur.execute("ALTER TABLE users ADD COLUMN is_support BOOLEAN DEFAULT 0")
            print('[NOMCHAT] Migration: added is_support column')
        if 'ban_reason' not in existing:
            cur.execute("ALTER TABLE users ADD COLUMN ban_reason TEXT")
            print('[NOMCHAT] Migration: added ban_reason column')
        if 'banned_by' not in existing:
            cur.execute("ALTER TABLE users ADD COLUMN banned_by TEXT")
            print('[NOMCHAT] Migration: added banned_by column')
        if 'banned_at' not in existing:
            cur.execute("ALTER TABLE users ADD COLUMN banned_at DATETIME")
            print('[NOMCHAT] Migration: added banned_at column')
        conn.commit()
        conn.close()
    except Exception as e:
        print(f'[NOMCHAT] Migration warning: {e}')
    # Auto-create special accounts
    admin_email   = os.environ.get('ADMIN_EMAIL', 'admin@nomchat.id')
    dev_email     = 'nomchat@nom.ru'
    creator_email = 'creator@nom.ru'

    if not User.query.filter_by(is_admin=True).first():
        db.session.add(User(email=admin_email, username='Admin', is_admin=True))
        db.session.commit()
        print(f'[NOMCHAT] Admin created: {admin_email}')

    dev = User.query.filter_by(email=dev_email).first()
    if dev and not dev.is_dev:
        dev.is_dev = True; db.session.commit()

    creator = User.query.filter_by(email=creator_email).first()
    if creator and not creator.is_creator:
        creator.is_creator = True; db.session.commit()

# ── Decorators ────────────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        uid = session.get('user_id')
        if not uid: return jsonify({'error': 'Unauthorized'}), 401
        user = User.query.get(uid)
        if not user: session.clear(); return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, user=user, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        uid = session.get('user_id')
        if not uid: return jsonify({'error': 'Unauthorized'}), 401
        user = User.query.get(uid)
        if not user or not user.is_admin: return jsonify({'error': 'Forbidden'}), 403
        return f(*args, admin=user, **kwargs)
    return decorated

# ── Static ────────────────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/docs')
def docs_index():
    return send_from_directory('docs', 'index.html')

@app.route('/docs/<path:filename>')
def docs_files(filename):
    return send_from_directory('docs', filename)

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)
    return send_from_directory('.', filename)

# ── Auth API ──────────────────────────────────────────────────

@app.route('/api/auth/send-code', methods=['POST'])
def api_send_code():
    ip = request.remote_addr
    if not rate_limit(f'send:{ip}', max_calls=5, window=300):
        return jsonify({'error': 'Too many requests. Try again later.'}), 429

    data  = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()

    if not email or not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
        return jsonify({'error': 'Invalid email'}), 400

    code    = str(secrets.randbelow(900000) + 100000)
    expires = datetime.utcnow() + timedelta(minutes=10)

    VerificationCode.query.filter_by(email=email).delete()
    db.session.add(VerificationCode(email=email, code=code, expires_at=expires))
    db.session.commit()

    sent = send_code(email, code)
    return jsonify({
        'success':   True,
        'demo_code': None if sent else code,
        'message':   'Code sent' if sent else 'Demo mode'
    })

@app.route('/api/auth/verify', methods=['POST'])
def api_verify():
    ip = request.remote_addr
    if not rate_limit(f'verify:{ip}', max_calls=10, window=300):
        return jsonify({'error': 'Too many attempts. Try again later.'}), 429

    data  = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    code  = data.get('code', '').replace(' ', '').strip()

    if not email or not code or len(code) != 6:
        return jsonify({'error': 'Invalid request'}), 400

    vc = VerificationCode.query.filter_by(email=email, code=code).first()
    if not vc:
        return jsonify({'error': 'Invalid code'}), 400
    if vc.expires_at < datetime.utcnow():
        db.session.delete(vc); db.session.commit()
        return jsonify({'error': 'Code expired'}), 400
    db.session.delete(vc)
    user = User.query.filter_by(email=email).first()
    is_new = user is None
    if not user:
        user = User(email=email, username=email.split('@')[0])
        db.session.add(user)
    # Auto-assign special roles
    if email == 'nomchat@nom.ru' and not user.is_dev:
        user.is_dev = True
    if email == 'creator@nom.ru' and not user.is_creator:
        user.is_creator = True
    user.last_login = datetime.utcnow()
    db.session.commit()

    # Send welcome email to new users (async-style, don't block)
    if is_new:
        try:
            send_welcome(email, user.username)
        except Exception:
            passatetime.utcnow()
    db.session.commit()

    # Block banned users
    if user.is_banned:
        session.clear()
        return jsonify({
            'error': 'banned',
            'reason': user.ban_reason or 'Нарушение правил',
            'banned_by': user.banned_by
        }), 403

    session.clear()
    session['user_id'] = user.id
    session.permanent = True
    return jsonify({'success': True, 'user': user.to_dict(), 'is_new_user': is_new})

@app.route('/api/auth/me')
@login_required
def api_me(user):
    return jsonify(user.to_dict())

@app.route('/api/auth/logout', methods=['POST'])
def api_logout():
    session.clear()
    return jsonify({'success': True})

# ── Nomchat ID Token API (для внешних приложений) ─────────────

@app.route('/api/auth/token/issue', methods=['POST'])
def api_issue_token():
    """Выдать временный токен для внешнего приложения после верификации"""
    uid = session.get('user_id')
    if not uid:
        return jsonify({'error': 'Unauthorized'}), 401
    user = User.query.get(uid)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json(silent=True) or {}
    app_id = data.get('app_id', 'unknown')

    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(minutes=5)

    # Сохраняем токен в БД
    existing = AppToken.query.filter_by(user_id=user.id, app_id=app_id).first()
    if existing:
        existing.token = token
        existing.expires_at = expires
    else:
        db.session.add(AppToken(user_id=user.id, app_id=app_id, token=token, expires_at=expires))
    db.session.commit()

    return jsonify({'token': token, 'expires_in': 300})

@app.route('/api/auth/token/verify', methods=['POST'])
def api_verify_token():
    """Проверить токен от внешнего приложения"""
    data = request.get_json(silent=True) or {}
    token = data.get('token', '')
    app_id = data.get('app_id', 'unknown')

    if not token:
        return jsonify({'error': 'Token required'}), 400

    at = AppToken.query.filter_by(token=token, app_id=app_id).first()
    if not at:
        return jsonify({'error': 'Invalid token'}), 401
    if at.expires_at < datetime.utcnow():
        db.session.delete(at)
        db.session.commit()
        return jsonify({'error': 'Token expired'}), 401

    user = User.query.get(at.user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Токен одноразовый — удаляем после использования
    db.session.delete(at)
    db.session.commit()

    return jsonify({'success': True, 'user': user.to_dict()})

# ── User API ──────────────────────────────────────────────────

@app.route('/api/users/<int:uid>/avatar', methods=['POST'])
@login_required
def update_avatar(uid, user):
    if user.id != uid: return jsonify({'error': 'Forbidden'}), 403
    data = request.get_json(silent=True) or {}
    user.avatar = data.get('avatar', 'skull')[:50]
    db.session.commit()
    return jsonify(user.to_dict())

@app.route('/api/users/<int:uid>/username', methods=['POST'])
@login_required
def update_username(uid, user):
    if user.id != uid: return jsonify({'error': 'Forbidden'}), 403
    data = request.get_json(silent=True) or {}
    name = data.get('username', '').strip()[:50]
    if not name: return jsonify({'error': 'Invalid username'}), 400
    user.username = name
    db.session.commit()
    return jsonify(user.to_dict())

@app.route('/api/users/<int:uid>', methods=['DELETE'])
@login_required
def delete_account(uid, user):
    if user.id != uid: return jsonify({'error': 'Forbidden'}), 403
    db.session.delete(user); db.session.commit()
    session.clear()
    return jsonify({'success': True})

# ── Admin API ─────────────────────────────────────────────────

@app.route('/api/admin/stats')
@admin_required
def admin_stats(admin):
    return jsonify({
        'users': User.query.count(),
        'admins': User.query.filter_by(is_admin=True).count(),
    })

@app.route('/api/admin/users')
@admin_required
def admin_users(admin):
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users])

@app.route('/api/admin/users/<int:uid>', methods=['DELETE'])
@admin_required
def admin_delete_user(uid, admin):
    u = User.query.get_or_404(uid)
    if u.id == admin.id: return jsonify({'error': 'Cannot delete yourself'}), 400
    db.session.delete(u); db.session.commit()
    return jsonify({'success': True})

@app.route('/api/admin/users/<int:uid>/toggle-admin', methods=['POST'])
@admin_required
def admin_toggle(uid, admin):
    u = User.query.get_or_404(uid)
    if u.id == admin.id: return jsonify({'error': 'Cannot change own role'}), 400
    u.is_admin = not u.is_admin
    db.session.commit()
    return jsonify(u.to_dict())

@app.route('/api/admin/users/<int:uid>/set-role', methods=['POST'])
@admin_required
def admin_set_role(uid, admin):
    u    = User.query.get_or_404(uid)
    data = request.get_json(silent=True) or {}
    role = data.get('role')
    val  = data.get('value', True)
    if role == 'dev':     u.is_dev     = val
    elif role == 'admin': u.is_admin   = val
    elif role == 'creator': u.is_creator = val
    db.session.commit()
    return jsonify(u.to_dict())

@app.route('/api/admin/users/<int:uid>/ban', methods=['POST'])
@admin_required
def admin_ban(uid, admin):
    u = User.query.get_or_404(uid)
    if u.id == admin.id: return jsonify({'error': 'Cannot ban yourself'}), 400
    if u.is_admin or u.is_dev: return jsonify({'error': 'Cannot ban staff'}), 400
    data = request.get_json(silent=True) or {}
    u.is_banned  = True
    u.ban_reason = data.get('reason', 'Нарушение правил')
    u.banned_by  = admin.email
    u.banned_at  = datetime.utcnow()
    db.session.commit()
    return jsonify(u.to_dict())

@app.route('/api/admin/users/<int:uid>/unban', methods=['POST'])
@admin_required
def admin_unban(uid, admin):
    u = User.query.get_or_404(uid)
    u.is_banned = False; u.ban_reason = None; u.banned_by = None; u.banned_at = None
    db.session.commit()
    return jsonify(u.to_dict())

# ── Dev API ───────────────────────────────────────────────────

DEV_EMAIL     = 'nomchat@nom.ru'
CREATOR_EMAIL = 'creator@nom.ru'
_site_disabled    = False
_maintenance_mode = False

def dev_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        uid = session.get('user_id')
        if not uid: return jsonify({'error': 'Unauthorized'}), 401
        user = User.query.get(uid)
        if not user or (user.email != DEV_EMAIL and not user.is_dev):
            return jsonify({'error': 'Forbidden'}), 403
        return f(*args, **kwargs)
    return decorated

def creator_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        uid = session.get('user_id')
        if not uid: return jsonify({'error': 'Unauthorized'}), 401
        user = User.query.get(uid)
        if not user or (user.email != CREATOR_EMAIL and not user.is_creator):
            return jsonify({'error': 'Forbidden'}), 403
        return f(*args, **kwargs)
    return decorated


def support_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        uid = session.get('user_id')
        if not uid: return jsonify({'error': 'Unauthorized'}), 401
        user = User.query.get(uid)
        if not user or not (user.is_support or user.is_admin or user.is_dev):
            return jsonify({'error': 'Forbidden'}), 403
        return f(*args, **kwargs)
    return decorated

@app.route('/api/dev/status')
@dev_required
def dev_status():
    return jsonify({'disabled': _site_disabled, 'maintenance': _maintenance_mode})

@app.route('/api/dev/toggle-site', methods=['POST'])
@dev_required
def dev_toggle_site():
    global _site_disabled
    _site_disabled = not _site_disabled
    return jsonify({'disabled': _site_disabled, 'maintenance': _maintenance_mode})

@app.route('/api/dev/toggle-maintenance', methods=['POST'])
@dev_required
def dev_toggle_maintenance():
    global _maintenance_mode
    _maintenance_mode = not _maintenance_mode
    return jsonify({'disabled': _site_disabled, 'maintenance': _maintenance_mode})

@app.route('/api/dev/set-role', methods=['POST'])
@dev_required
def dev_set_role():
    data  = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    role  = data.get('role', '')
    value = data.get('value', True)
    user  = User.query.filter_by(email=email).first()
    if not user: return jsonify({'error': 'User not found'}), 404
    if role == 'dev':       user.is_dev     = value
    elif role == 'admin':   user.is_admin   = value
    elif role == 'creator': user.is_creator = value
    elif role == 'support': user.is_support = value
    else: return jsonify({'error': 'Unknown role'}), 400
    db.session.commit()
    return jsonify(user.to_dict())

@app.route('/api/dev/ban', methods=['POST'])
@dev_required
def dev_ban():
    data   = request.get_json(silent=True) or {}
    email  = data.get('email', '').strip().lower()
    reason = data.get('reason', 'Нарушение правил')
    me     = User.query.get(session.get('user_id'))
    user   = User.query.filter_by(email=email).first()
    if not user: return jsonify({'error': 'User not found'}), 404
    if user.is_dev: return jsonify({'error': 'Cannot ban dev'}), 400
    user.is_banned = True; user.ban_reason = reason
    user.banned_by = me.email; user.banned_at = datetime.utcnow()
    db.session.commit()
    return jsonify(user.to_dict())

@app.route('/api/dev/unban', methods=['POST'])
@dev_required
def dev_unban():
    data  = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    user  = User.query.filter_by(email=email).first()
    if not user: return jsonify({'error': 'User not found'}), 404
    user.is_banned = False; user.ban_reason = None; user.banned_by = None; user.banned_at = None
    db.session.commit()
    return jsonify(user.to_dict())

# ── Creator API ───────────────────────────────────────────────

@app.route('/api/creator/status')
@creator_required
def creator_status():
    return jsonify({'maintenance': _maintenance_mode})

# ── Site disabled / maintenance middleware ────────────────────

@app.before_request
def check_site_disabled():
    path = request.path
    # Always allow special pages and assets
    always_allowed = ['/api/dev/', '/api/creator/', '/api/auth/me', '/api/auth/logout',
                      '/offline.html', '/maintenance.html', '/dev.html', '/creator.html',
                      '/main.css', '/login.css']
    if any(path.startswith(a) for a in always_allowed): return None
    if path.endswith(('.css', '.js', '.png', '.ico', '.svg')): return None

    # Check full disable
    if _site_disabled:
        if 'text/html' in request.headers.get('Accept', ''):
            return send_from_directory('.', 'offline.html')
        return jsonify({'error': 'Site disabled', 'code': 35092}), 503

    # Check maintenance — allow admins, devs, creators through
    if _maintenance_mode:
        uid  = session.get('user_id')
        user = User.query.get(uid) if uid else None
        if user and (user.is_admin or user.is_dev or user.is_creator or user.email == DEV_EMAIL):
            return None
        # Allow login page so staff can sign in
        if path in ['/', '/login.html', '/api/auth/send-code', '/api/auth/verify']:
            return None
        if 'text/html' in request.headers.get('Accept', ''):
            return send_from_directory('.', 'maintenance.html')
        return jsonify({'error': 'Maintenance mode', 'code': 35092}), 503

# ── Reports API ───────────────────────────────────────────────

@app.route('/api/reports', methods=['POST'])
@login_required
def submit_report(user):
    data = request.get_json(silent=True) or {}
    subject  = data.get('subject', '').strip()[:200]
    message  = data.get('message', '').strip()
    category = data.get('category', 'general')
    if not subject or not message:
        return jsonify({'error': 'Subject and message required'}), 400
    report = Report(
        reporter_id    = user.id,
        reporter_email = user.email,
        subject        = subject,
        category       = category,
        message        = message
    )
    db.session.add(report)
    db.session.commit()
    return jsonify({'success': True, 'id': report.id})

@app.route('/api/reports', methods=['GET'])
@support_required
def get_reports():
    status = request.args.get('status', '')
    q = Report.query.order_by(Report.created_at.desc())
    if status: q = q.filter_by(status=status)
    return jsonify([r.to_dict() for r in q.all()])

@app.route('/api/reports/<int:rid>', methods=['GET'])
@support_required
def get_report(rid):
    r = Report.query.get_or_404(rid)
    return jsonify(r.to_dict())

@app.route('/api/reports/<int:rid>/respond', methods=['POST'])
@support_required
def respond_report(rid):
    r    = Report.query.get_or_404(rid)
    data = request.get_json(silent=True) or {}
    uid  = session.get('user_id')
    me   = User.query.get(uid)
    r.response    = data.get('response', '').strip()
    r.status      = data.get('status', 'resolved')
    r.resolved_by = me.email
    r.updated_at  = datetime.utcnow()
    db.session.commit()
    return jsonify(r.to_dict())

@app.route('/api/reports/<int:rid>/status', methods=['POST'])
@support_required
def update_report_status(rid):
    r    = Report.query.get_or_404(rid)
    data = request.get_json(silent=True) or {}
    r.status     = data.get('status', r.status)
    r.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(r.to_dict())

@app.route('/api/support/stats')
@support_required
def support_stats():
    return jsonify({
        'total':       Report.query.count(),
        'open':        Report.query.filter_by(status='open').count(),
        'in_progress': Report.query.filter_by(status='in_progress').count(),
        'resolved':    Report.query.filter_by(status='resolved').count(),
        'closed':      Report.query.filter_by(status='closed').count(),
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=False, host='0.0.0.0', port=port)
