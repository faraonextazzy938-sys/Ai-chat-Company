// ── Nomchat ID — Cookie Consent Banner ───────────────────────

(function () {
    // ── Real cookie helpers ───────────────────────────────────
    function setCookie(name, value, days) {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
    }

    function getCookie(name) {
        return document.cookie.split('; ').reduce((acc, part) => {
            const [k, v] = part.split('=');
            return k === name ? decodeURIComponent(v) : acc;
        }, null);
    }

    // Already answered — don't show
    if (getCookie('nc_consent')) return;

    const banner = document.createElement('div');
    banner.id = 'nc-cookie-banner';
    banner.innerHTML = `
        <div class="nc-cookie-inner">
            <div class="nc-cookie-icon">🍪</div>
            <div class="nc-cookie-text">
                <strong>We use cookies</strong>
                <p>We use cookies to keep you signed in, remember your language preference, and improve your experience. By continuing, you agree to our <a href="https://docs.nomchat.up.railway.app/cookies.html" target="_blank">Cookie Policy</a>.</p>
            </div>
            <div class="nc-cookie-actions">
                <button class="nc-cookie-decline" id="nc-cookie-decline">Decline</button>
                <button class="nc-cookie-accept" id="nc-cookie-accept">Accept all</button>
            </div>
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
        #nc-cookie-banner {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(120px);
            z-index: 9999;
            width: calc(100% - 48px);
            max-width: 720px;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 8px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
            padding: 24px 28px;
            opacity: 0;
            transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
                        opacity 0.4s ease;
            border: 1px solid rgba(0,0,0,0.06);
        }
        #nc-cookie-banner.nc-cookie-show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        #nc-cookie-banner.nc-cookie-hide {
            transform: translateX(-50%) translateY(140px);
            opacity: 0;
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                        opacity 0.3s ease;
        }
        .nc-cookie-inner {
            display: flex;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
        }
        .nc-cookie-icon {
            font-size: 2.2em;
            flex-shrink: 0;
            animation: nc-cookie-wobble 2s ease-in-out infinite;
        }
        @keyframes nc-cookie-wobble {
            0%, 100% { transform: rotate(0deg); }
            25%       { transform: rotate(-8deg); }
            75%       { transform: rotate(8deg); }
        }
        .nc-cookie-text {
            flex: 1;
            min-width: 200px;
        }
        .nc-cookie-text strong {
            display: block;
            font-size: 1em;
            font-weight: 800;
            color: #111;
            margin-bottom: 4px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        }
        .nc-cookie-text p {
            font-size: 0.84em;
            color: #666;
            line-height: 1.5;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        }
        .nc-cookie-text a {
            color: #5b6ef5;
            text-decoration: none;
            font-weight: 600;
        }
        .nc-cookie-text a:hover { text-decoration: underline; }
        .nc-cookie-actions {
            display: flex;
            gap: 10px;
            flex-shrink: 0;
        }
        .nc-cookie-decline {
            padding: 10px 20px;
            border-radius: 99px;
            background: transparent;
            border: 1.5px solid #e0e0e0;
            color: #666;
            font-size: 0.88em;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            font-family: inherit;
            white-space: nowrap;
        }
        .nc-cookie-decline:hover {
            border-color: #bbb;
            color: #333;
            background: #f5f5f5;
        }
        .nc-cookie-accept {
            padding: 10px 22px;
            border-radius: 99px;
            background: linear-gradient(135deg, #5b6ef5 0%, #7c3aed 50%, #06b6d4 100%);
            border: none;
            color: #fff;
            font-size: 0.88em;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
            font-family: inherit;
            white-space: nowrap;
            box-shadow: 0 4px 16px rgba(91,110,245,0.35);
        }
        .nc-cookie-accept:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 24px rgba(91,110,245,0.5);
        }
        .nc-cookie-accept:active { transform: translateY(0); }

        @media (max-width: 560px) {
            #nc-cookie-banner { bottom: 16px; padding: 20px; }
            .nc-cookie-inner { gap: 14px; }
            .nc-cookie-actions { width: 100%; justify-content: flex-end; }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(banner);

    // Show with delay
    requestAnimationFrame(() => {
        setTimeout(() => banner.classList.add('nc-cookie-show'), 600);
    });

    function dismiss(accepted) {
        banner.classList.remove('nc-cookie-show');
        banner.classList.add('nc-cookie-hide');
        // Set real cookie for 365 days
        setCookie('nc_consent', accepted ? 'accepted' : 'declined', 365);
        // Also set analytics/functional cookies if accepted
        if (accepted) {
            setCookie('nc_analytics', '1', 365);
            setCookie('nc_functional', '1', 365);
        }
        setTimeout(() => banner.remove(), 500);
    }

    document.getElementById('nc-cookie-accept').addEventListener('click', () => dismiss(true));
    document.getElementById('nc-cookie-decline').addEventListener('click', () => dismiss(false));
})();
