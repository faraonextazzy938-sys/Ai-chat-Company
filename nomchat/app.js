
// Без блокирующих fetch на главной — только если явно вызвано
const AVATARS_LIST = [
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

function getAvatarHTML(id, size) {
    const av = AVATARS_LIST.find(a => a.id === id) || AVATARS_LIST[1];
    if (av.type === 'svg') return `<span style="width:${size};height:${size};display:flex">${av.content}</span>`;
    return `<span style="font-size:${size}">${av.content}</span>`;
}

// Обновление шапки — с таймаутом чтобы не зависало
async function initHeader() {
    try {
        const ctrl = new AbortController();
        const tid  = setTimeout(() => ctrl.abort(), 3000);
        const res  = await fetch('/api/auth/me', { credentials:'include', signal: ctrl.signal });
        clearTimeout(tid);
        if (!res.ok) return;
        const user = await res.json();
        const area = document.getElementById('header-user-area');
        const nav  = document.getElementById('nav-profile');
        if (area) {
            area.innerHTML = `<a href="profile.html" style="display:flex;align-items:center;gap:8px;text-decoration:none;color:#fff">
                <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#1565c0,#26c6da);display:flex;align-items:center;justify-content:center">
                    ${getAvatarHTML(user.avatar || 'bolt', '1.1em')}
                </div>
                <span style="font-size:0.88em;font-weight:600;color:#fff">${user.username}</span>
            </a>`;
        }
        if (nav) nav.style.display = '';
    } catch (_) { /* не авторизован или таймаут — ок */ }
}

document.addEventListener('DOMContentLoaded', initHeader);
