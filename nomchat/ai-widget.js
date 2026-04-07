// ── Nomchat ID — AI Chat Widget ───────────────────────────────
// Powered by AI Chat Company / Groq Llama 3.3

(function () {
    const GROQ_KEY = 'ВСТАВЬ_СВОЙ_КЛЮЧ'; // gsk_...
    const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

    const SYSTEM_PROMPT = `You are Nomchat AI — a helpful assistant built into Nomchat ID by Nomchat prod.
You help users with:
- Questions about Nomchat ID (accounts, login, avatars, bans)
- How to connect apps to Nomchat ID
- Privacy, cookies, terms questions
- General help

Keep answers short and friendly. Use emojis occasionally.
If asked who made you: "I'm Nomchat AI, created by Nomchat prod. 🤖"
If asked about AI Chat Pro: "AI Chat Pro is a product by AI Chat Company, connected to Nomchat ID."
Answer in the language the user writes in.`;

    // ── Styles ────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        #nc-ai-btn {
            position: fixed; bottom: 24px; right: 24px; z-index: 9000;
            width: 56px; height: 56px; border-radius: 50%;
            background: linear-gradient(135deg, #5b6ef5, #7c3aed);
            border: none; cursor: pointer;
            box-shadow: 0 4px 20px rgba(91,110,245,0.5);
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5em; transition: all 0.3s;
            animation: nc-ai-pulse 3s ease-in-out infinite;
        }
        #nc-ai-btn:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(91,110,245,0.7); }
        @keyframes nc-ai-pulse {
            0%,100% { box-shadow: 0 4px 20px rgba(91,110,245,0.5); }
            50%      { box-shadow: 0 4px 32px rgba(91,110,245,0.8), 0 0 0 8px rgba(91,110,245,0.1); }
        }

        #nc-ai-window {
            position: fixed; bottom: 92px; right: 24px; z-index: 9001;
            width: 360px; height: 520px;
            background: #0f0f1a;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px;
            box-shadow: 0 24px 64px rgba(0,0,0,0.6);
            display: flex; flex-direction: column;
            overflow: hidden;
            transform: scale(0.8) translateY(20px);
            opacity: 0; pointer-events: none;
            transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        #nc-ai-window.open {
            transform: scale(1) translateY(0);
            opacity: 1; pointer-events: all;
        }

        .nc-ai-header {
            padding: 16px 20px;
            background: linear-gradient(135deg, #5b6ef5, #7c3aed);
            display: flex; align-items: center; gap: 12px;
        }
        .nc-ai-avatar {
            width: 36px; height: 36px; border-radius: 50%;
            background: rgba(255,255,255,0.2);
            display: flex; align-items: center; justify-content: center;
            font-size: 1.1em; flex-shrink: 0;
        }
        .nc-ai-title { flex: 1; }
        .nc-ai-title strong { display: block; color: #fff; font-size: 0.95em; font-weight: 800; }
        .nc-ai-title span { color: rgba(255,255,255,0.7); font-size: 0.75em; }
        .nc-ai-close {
            background: rgba(255,255,255,0.15); border: none; border-radius: 8px;
            color: #fff; width: 28px; height: 28px; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            font-size: 1em; transition: background 0.2s;
        }
        .nc-ai-close:hover { background: rgba(255,255,255,0.25); }

        .nc-ai-messages {
            flex: 1; overflow-y: auto; padding: 16px;
            display: flex; flex-direction: column; gap: 12px;
        }
        .nc-ai-messages::-webkit-scrollbar { width: 4px; }
        .nc-ai-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }

        .nc-ai-msg {
            max-width: 85%; padding: 10px 14px;
            border-radius: 14px; font-size: 0.88em; line-height: 1.5;
            animation: nc-msg-in 0.2s ease;
        }
        @keyframes nc-msg-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .nc-ai-msg.user {
            align-self: flex-end;
            background: linear-gradient(135deg, #5b6ef5, #7c3aed);
            color: #fff; border-bottom-right-radius: 4px;
        }
        .nc-ai-msg.bot {
            align-self: flex-start;
            background: rgba(255,255,255,0.07);
            color: rgba(240,240,255,0.9);
            border: 1px solid rgba(255,255,255,0.08);
            border-bottom-left-radius: 4px;
        }
        .nc-ai-msg.typing { opacity: 0.6; }
        .nc-ai-dots span {
            display: inline-block; width: 6px; height: 6px;
            background: rgba(240,240,255,0.6); border-radius: 50%;
            margin: 0 2px; animation: nc-dot 1.2s ease-in-out infinite;
        }
        .nc-ai-dots span:nth-child(2) { animation-delay: 0.2s; }
        .nc-ai-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes nc-dot { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }

        .nc-ai-input-area {
            padding: 12px 16px;
            border-top: 1px solid rgba(255,255,255,0.08);
            display: flex; gap: 8px; align-items: flex-end;
        }
        #nc-ai-input {
            flex: 1; background: rgba(255,255,255,0.07);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px; padding: 10px 14px;
            color: #f0f0ff; font-size: 0.88em; font-family: inherit;
            outline: none; resize: none; max-height: 100px;
            transition: border-color 0.2s;
        }
        #nc-ai-input:focus { border-color: rgba(91,110,245,0.5); }
        #nc-ai-input::placeholder { color: rgba(240,240,255,0.3); }
        #nc-ai-send {
            width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
            background: linear-gradient(135deg, #5b6ef5, #7c3aed);
            border: none; cursor: pointer; color: #fff;
            display: flex; align-items: center; justify-content: center;
            font-size: 1em; transition: all 0.2s;
        }
        #nc-ai-send:hover { transform: scale(1.05); }
        #nc-ai-send:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        .nc-ai-powered {
            text-align: center; padding: 6px;
            font-size: 0.68em; color: rgba(240,240,255,0.2);
        }
        .nc-ai-powered a { color: rgba(91,110,245,0.6); text-decoration: none; }

        @media (max-width: 420px) {
            #nc-ai-window { width: calc(100vw - 32px); right: 16px; bottom: 84px; }
        }
    `;
    document.head.appendChild(style);

    // ── HTML ──────────────────────────────────────────────────
    const btn = document.createElement('button');
    btn.id = 'nc-ai-btn';
    btn.title = 'Nomchat AI';
    btn.innerHTML = '🤖';

    const win = document.createElement('div');
    win.id = 'nc-ai-window';
    win.innerHTML = `
        <div class="nc-ai-header">
            <div class="nc-ai-avatar">🤖</div>
            <div class="nc-ai-title">
                <strong>Nomchat AI</strong>
                <span>by AI Chat Company</span>
            </div>
            <button class="nc-ai-close" id="nc-ai-close-btn">✕</button>
        </div>
        <div class="nc-ai-messages" id="nc-ai-messages">
            <div class="nc-ai-msg bot">
                👋 Hi! I'm Nomchat AI. Ask me anything about Nomchat ID!
            </div>
        </div>
        <div class="nc-ai-input-area">
            <textarea id="nc-ai-input" placeholder="Ask something..." rows="1"></textarea>
            <button id="nc-ai-send">➤</button>
        </div>
        <div class="nc-ai-powered">Powered by <a href="https://aichatcompany.up.railway.app" target="_blank">AI Chat Company</a></div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(win);

    // ── Logic ─────────────────────────────────────────────────
    let isOpen = false;
    let isLoading = false;
    const history = [];

    btn.addEventListener('click', () => {
        isOpen = !isOpen;
        win.classList.toggle('open', isOpen);
        btn.innerHTML = isOpen ? '✕' : '🤖';
        if (isOpen) document.getElementById('nc-ai-input').focus();
    });

    document.getElementById('nc-ai-close-btn').addEventListener('click', () => {
        isOpen = false;
        win.classList.remove('open');
        btn.innerHTML = '🤖';
    });

    const input = document.getElementById('nc-ai-input');
    const sendBtn = document.getElementById('nc-ai-send');

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });
    sendBtn.addEventListener('click', sendMessage);

    function addMsg(text, role) {
        const msgs = document.getElementById('nc-ai-messages');
        const div = document.createElement('div');
        div.className = `nc-ai-msg ${role}`;
        div.textContent = text;
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
        return div;
    }

    function showTyping() {
        const msgs = document.getElementById('nc-ai-messages');
        const div = document.createElement('div');
        div.className = 'nc-ai-msg bot typing';
        div.id = 'nc-ai-typing';
        div.innerHTML = '<div class="nc-ai-dots"><span></span><span></span><span></span></div>';
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }

    function removeTyping() {
        document.getElementById('nc-ai-typing')?.remove();
    }

    async function sendMessage() {
        const text = input.value.trim();
        if (!text || isLoading) return;

        input.value = '';
        input.style.height = 'auto';
        addMsg(text, 'user');
        history.push({ role: 'user', content: text });

        isLoading = true;
        sendBtn.disabled = true;
        showTyping();

        try {
            const res = await fetch(GROQ_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_KEY}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        ...history.slice(-8)
                    ],
                    max_tokens: 300,
                    temperature: 0.7
                })
            });

            const data = await res.json();
            const reply = data.choices?.[0]?.message?.content || 'Sorry, something went wrong.';
            removeTyping();
            addMsg(reply, 'bot');
            history.push({ role: 'assistant', content: reply });
        } catch (e) {
            removeTyping();
            addMsg('Connection error. Please try again.', 'bot');
        }

        isLoading = false;
        sendBtn.disabled = false;
        input.focus();
    }
})();
