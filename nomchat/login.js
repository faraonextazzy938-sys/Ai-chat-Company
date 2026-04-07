const API = '';

const AVATARS = [
    { id:'skull', type:'svg', content:`<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#000"/><circle cx="50" cy="50" r="42" fill="#f5c400"/><ellipse cx="50" cy="47" rx="20" ry="19" fill="#000"/><ellipse cx="50" cy="47" rx="16" ry="15" fill="#f5c400"/><circle cx="41" cy="45" r="6" fill="#000"/><circle cx="59" cy="45" r="6" fill="#000"/><polygon points="50,55 46,63 54,63" fill="#000"/></svg>` },
    { id:'bolt',   type:'emoji', content:'⚡' },
    { id:'star',   type:'emoji', content:'⭐' },
    { id:'fire',   type:'emoji', content:'🔥' },
    { id:'sword',  type:'emoji', content:'⚔️' },
    { id:'shield', type:'emoji', content:'🛡️' },
    { id:'gem',    type:'emoji', content:'💎' },
    { id:'trophy', type:'emoji', content:'🏆' },
    { id:'skull2', type:'emoji', content:'💀' },
    { id:'robot',  type:'emoji', content:'🤖' },
    { id:'alien',  type:'emoji', content:'👾' },
    { id:'ninja',  type:'emoji', content:'🥷' },
    { id:'dragon', type:'emoji', content:'🐉' },
    { id:'wolf',   type:'emoji', content:'🐺' },
    { id:'lion',   type:'emoji', content:'🦁' },
    { id:'ghost',  type:'emoji', content:'👻' },
    { id:'demon',  type:'emoji', content:'😈' },
    { id:'crown',  type:'emoji', content:'👑' },
    { id:'eagle',  type:'emoji', content:'🦅' },
    { id:'shark',  type:'emoji', content:'🦈' },
];

let state = {
    email: '',
    userId: null,
    isNewUser: false,
    selectedAvatar: null
};

document.addEventListener('DOMContentLoaded', async () => {
    // Проверка сессии с таймаутом
    try {
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch(`${API}/api/auth/me`, { credentials:'include', signal:ctrl.signal });
        if (res.ok) { window.location.href = 'profile.html'; return; }
    } catch (_) {}

    buildGrid();

    document.getElementById('email-inp').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    document.getElementById('code-inp').addEventListener('keydown',  e => { if (e.key === 'Enter') doVerify(); });
    document.getElementById('username-inp').addEventListener('keydown', e => { if (e.key === 'Enter') doSetUsername(); });

    // Активация кнопки при валидном email
    document.getElementById('email-inp').addEventListener('input', e => {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value.trim());
        document.getElementById('btn-login').classList.toggle('ready', ok);
    });

    // Форматирование кода "123 456"
    document.getElementById('code-inp').addEventListener('input', e => {
        let v = e.target.value.replace(/\D/g, '').slice(0, 6);
        e.target.value = v.length > 3 ? v.slice(0,3) + ' ' + v.slice(3) : v;
    });

    // Валидация имени пользователя
    document.getElementById('username-inp').addEventListener('input', e => {
        const val  = e.target.value.trim();
        const ok   = /^[a-zA-Z0-9_]{3,30}$/.test(val);
        const hint = document.getElementById('username-hint');
        const btn  = document.getElementById('btn-username');

        if (!val) {
            hint.style.color = '#999';
            hint.textContent = '3–30 characters. Letters, numbers and underscores only.';
        } else if (!ok) {
            hint.style.color = '#e53935';
            hint.textContent = val.length < 3 ? 'Too short (min 3 characters)' : 'Only letters, numbers and _ allowed';
        } else {
            hint.style.color = '#4caf50';
            hint.textContent = '✓ Looks good!';
        }
        btn.classList.toggle('ready', ok);
        btn.disabled = !ok;
    });
});

function buildGrid() {
    const grid = document.getElementById('av-grid');
    grid.innerHTML = AVATARS.map(a => {
        const inner = a.type === 'svg'
            ? `<span style="width:44px;height:44px;display:flex">${a.content}</span>`
            : `<span>${a.content}</span>`;
        return `<div class="sc-av-item" data-id="${a.id}" onclick="selectAv('${a.id}',this)">${inner}</div>`;
    }).join('');
}

// ── Шаг 1: отправить код ──────────────────────────────────────
async function doLogin() {
    const email = document.getElementById('email-inp').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { shake('email-inp'); return; }

    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.innerHTML = '<span class="sc-spinner"></span>Sending...';

    try {
        const res  = await fetch(`${API}/api/auth/send-code`, {
            method:'POST', credentials:'include',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error');

        state.email = email;
        document.getElementById('email-show').textContent = email;

        if (data.demo_code) {
            document.getElementById('demo-val').textContent =
                data.demo_code.slice(0,3) + ' ' + data.demo_code.slice(3);
            document.getElementById('demo-box').style.display = 'flex';
        } else {
            document.getElementById('demo-box').style.display = 'none';
        }
        goStep(2);
    } catch (_) { shake('email-inp'); }

    btn.disabled = false;
    btn.innerHTML = 'LOG IN';
}

// ── Шаг 2: проверить код ──────────────────────────────────────
async function doVerify() {
    const raw = document.getElementById('code-inp').value.replace(/\s/g, '');
    if (raw.length !== 6) { shake('code-inp'); return; }

    const btn = document.getElementById('btn-verify');
    btn.disabled = true;
    btn.innerHTML = '<span class="sc-spinner"></span>Verifying...';

    try {
        const res  = await fetch(`${API}/api/auth/verify`, {
            method:'POST', credentials:'include',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ email: state.email, code: raw })
        });
        const data = await res.json();

        // Handle ban
        if (res.status === 403 && data.error === 'banned') {
            showBanScreen(data.reason, data.banned_by);
            return;
        }

        if (!res.ok) throw new Error(data.error || 'Invalid code');

        state.userId    = data.user.id;
        state.isNewUser = data.is_new_user;

        if (data.is_new_user) {
            // Новый пользователь — предложить имя
            document.getElementById('username-inp').value = data.user.username;
            document.getElementById('username-inp').dispatchEvent(new Event('input'));
            goStep(3);
        } else {
            // Существующий — сразу к аватару
            document.getElementById('done-username').textContent = data.user.username;
            goStep(4);
        }
        return;
    } catch (_) {
        shake('code-inp');
        document.getElementById('code-inp').value = '';
    }

    btn.disabled = false;
    btn.innerHTML = 'CONTINUE';
}

// ── Шаг 3: установить имя ─────────────────────────────────────
async function doSetUsername() {
    const name = document.getElementById('username-inp').value.trim();
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(name)) { shake('username-inp'); return; }

    const btn = document.getElementById('btn-username');
    btn.disabled = true;
    btn.innerHTML = '<span class="sc-spinner"></span>Saving...';

    try {
        const res  = await fetch(`${API}/api/users/${state.userId}/username`, {
            method:'POST', credentials:'include',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ username: name })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error');

        document.getElementById('done-username').textContent = data.username;
        goStep(4);
        return;
    } catch (e) {
        document.getElementById('username-hint').style.color = '#e53935';
        document.getElementById('username-hint').textContent = e.message || 'Username taken, try another';
    }

    btn.disabled = false;
    btn.innerHTML = 'CONTINUE';
    btn.classList.add('ready');
}

// ── Шаг 4: выбор аватара ─────────────────────────────────────
function selectAv(id, el) {
    document.querySelectorAll('.sc-av-item').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');
    state.selectedAvatar = id;
    const btn = document.getElementById('btn-av');
    btn.disabled = false;
    btn.classList.add('ready');
}

function confirmAvatar() {
    const av = AVATARS.find(a => a.id === state.selectedAvatar);
    if (!av) return;
    const inner = av.type === 'svg'
        ? `<span style="width:52px;height:52px;display:flex">${av.content}</span>`
        : av.content;
    document.getElementById('done-av').innerHTML = inner;

    if (state.userId) {
        fetch(`${API}/api/users/${state.userId}/avatar`, {
            method:'POST', credentials:'include',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ avatar: state.selectedAvatar })
        }).catch(() => {});
    }
    goStep(5);
}

// ── Повторная отправка ────────────────────────────────────────
async function resend() {
    try {
        const res  = await fetch(`${API}/api/auth/send-code`, {
            method:'POST', credentials:'include',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ email: state.email })
        });
        const data = await res.json();
        if (data.demo_code) {
            document.getElementById('demo-val').textContent =
                data.demo_code.slice(0,3) + ' ' + data.demo_code.slice(3);
            document.getElementById('demo-box').style.display = 'flex';
        }
    } catch (_) {}
}

// ── Навигация ─────────────────────────────────────────────────
function goStep(n) {
    document.querySelectorAll('.sc-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('s' + n).classList.add('active');

    const fill = document.getElementById('fill');
    const l1   = document.getElementById('lbl1');
    const l2   = document.getElementById('lbl2');
    const w    = { 1:'20%', 2:'55%', 3:'70%', 4:'88%', 5:'100%' };
    fill.style.width = w[n] || '20%';

    if (n === 1) {
        l1.className = 'sc-lbl active'; l2.className = 'sc-lbl';
    } else if (n <= 2) {
        l1.className = 'sc-lbl done'; l2.className = 'sc-lbl active';
    } else {
        l1.className = 'sc-lbl done'; l2.className = 'sc-lbl done';
    }
}

function shake(id) {
    const el = document.getElementById(id);
    el.classList.remove('error');
    void el.offsetWidth;
    el.classList.add('error');
    setTimeout(() => el.classList.remove('error'), 1500);
}

// ── Ban screen ────────────────────────────────────────────────
function showBanScreen(reason, bannedBy) {
    // Hide the card content and show ban message
    const card = document.querySelector('.sc-card');
    card.innerHTML = `
        <div style="text-align:center;padding:8px 0">
            <div style="font-size:3em;margin-bottom:16px;filter:drop-shadow(0 0 12px rgba(239,68,68,0.6))">🔨</div>
            <div style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:6px 14px;display:inline-block;font-size:0.72em;font-weight:900;letter-spacing:2px;color:#ef4444;margin-bottom:20px;">ACCOUNT BANNED</div>
            <h2 style="font-size:1.3em;font-weight:900;margin-bottom:10px;color:#f0f0ff">Access denied</h2>
            <p style="font-size:0.88em;color:rgba(240,240,255,0.6);line-height:1.6;margin-bottom:20px">
                Your account has been banned from Nomchat ID.
            </p>
            <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px;text-align:left;margin-bottom:24px">
                <div style="font-size:0.75em;font-weight:700;color:rgba(240,240,255,0.35);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Ban reason</div>
                <div style="font-size:0.9em;color:#ef4444;font-weight:600">${reason || 'Нарушение правил'}</div>
                ${bannedBy ? `<div style="font-size:0.75em;color:rgba(240,240,255,0.35);margin-top:6px">by ${bannedBy}</div>` : ''}
            </div>
            <p style="font-size:0.8em;color:rgba(240,240,255,0.35)">
                If you believe this is a mistake, contact<br>
                <a href="mailto:support@nomchat.id" style="color:#5b6ef5;text-decoration:none">support@nomchat.id</a>
            </p>
        </div>
    `;
}
