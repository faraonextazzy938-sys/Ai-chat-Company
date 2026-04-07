// ── Nomchat ID — Visual Effects ───────────────────────────────
// WebGL shader + scroll reveal + parallax + cursor glow

(function () {

// ── 1. WebGL Shader Background ────────────────────────────────
const canvas = document.getElementById('nc-canvas') || (() => {
    const c = document.createElement('canvas');
    c.id = 'nc-canvas';
    c.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
    document.body.prepend(c);
    return c;
})();

const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

if (gl) {
    const vert = `attribute vec2 a; void main(){gl_Position=vec4(a,0,1);}`;
    const frag = `
        precision mediump float;
        uniform float t;
        uniform vec2 r;

        float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); }
        float noise(vec2 p){
            vec2 i=floor(p), f=fract(p);
            f=f*f*(3.-2.*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                       mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
        }
        float fbm(vec2 p){
            float v=0.,a=.5;
            for(int i=0;i<6;i++){v+=a*noise(p);p*=2.;a*=.5;}
            return v;
        }

        void main(){
            vec2 uv = gl_FragCoord.xy/r;
            uv.y = 1.-uv.y;

            float time = t * 0.1;
            vec2 q = vec2(fbm(uv+time*.4), fbm(uv+vec2(1.7,9.2)));
            vec2 s = vec2(fbm(uv+q+vec2(1.7,9.2)+time*.15),
                          fbm(uv+q+vec2(8.3,2.8)+time*.12));
            float f = fbm(uv+s);

            // Purple-blue-cyan palette
            vec3 col1 = vec3(0.06, 0.04, 0.12);
            vec3 col2 = vec3(0.08, 0.06, 0.20);
            vec3 col3 = vec3(0.04, 0.08, 0.18);
            vec3 col = mix(col1, mix(col2, col3, f), f*f);

            // Accent glow spots
            float glow1 = exp(-length(uv - vec2(0.2, 0.3)) * 8.) * 0.06;
            float glow2 = exp(-length(uv - vec2(0.8, 0.7)) * 10.) * 0.05;
            col += vec3(0.22, 0.27, 0.98) * glow1;
            col += vec3(0.06, 0.71, 0.84) * glow2;

            // Vignette
            vec2 vig = uv*(1.-uv.yx);
            col *= pow(vig.x*vig.y*16., 0.25);

            gl_FragColor = vec4(col, 1.0);
        }
    `;

    function mkShader(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s); return s;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, mkShader(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog); gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uT = gl.getUniformLocation(prog, 't');
    const uR = gl.getUniformLocation(prog, 'r');

    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener('resize', resize);

    const t0 = performance.now();
    (function loop() {
        gl.uniform1f(uT, (performance.now() - t0) / 1000);
        gl.uniform2f(uR, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(loop);
    })();
}

// ── 2. Scroll reveal with blur ────────────────────────────────
const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (!e.isIntersecting) return;
        const delay = parseInt(e.target.dataset.revealDelay || 0);
        setTimeout(() => {
            e.target.style.opacity    = '1';
            e.target.style.transform  = 'translateY(0) scale(1)';
            e.target.style.filter     = 'blur(0px)';
        }, delay);
        obs.unobserve(e.target);
    });
}, { threshold: 0.07, rootMargin: '0px 0px -30px 0px' });

function initReveal() {
    const targets = [
        '.nc-feat-card', '.nc-game-card', '.nc-stat',
        '.nc-section-label', '.nc-section-title',
        '.nc-connect-step', '.nc-connect-title', '.nc-connect-sub',
        '.nc-hero-title', '.nc-hero-sub', '.nc-hero-actions', '.nc-stats',
        '.nc-hero-logo'
    ];
    targets.forEach(sel => {
        document.querySelectorAll(sel).forEach((el, i) => {
            el.style.cssText += `
                opacity:0;
                transform:translateY(28px) scale(0.97);
                filter:blur(6px);
                transition:
                    opacity 0.75s cubic-bezier(0.4,0,0.2,1),
                    transform 0.75s cubic-bezier(0.4,0,0.2,1),
                    filter 0.75s cubic-bezier(0.4,0,0.2,1);
            `;
            el.dataset.revealDelay = (i % 5) * 70;
            obs.observe(el);
        });
    });
}

// ── 3. Parallax ───────────────────────────────────────────────
function initParallax() {
    const hero = document.querySelector('.nc-hero-inner');
    const orbs = document.querySelectorAll('.orb');

    window.addEventListener('scroll', () => {
        const y = window.scrollY;
        if (hero) {
            hero.style.transform = `translateY(${y * 0.2}px)`;
            hero.style.opacity   = Math.max(0, 1 - y / 700);
        }
        orbs.forEach((o, i) => {
            o.style.transform = `translateY(${y * (0.06 + i * 0.03)}px)`;
        });
    }, { passive: true });
}

// ── 4. Cursor glow ────────────────────────────────────────────
function initCursorGlow() {
    const glow = document.createElement('div');
    glow.style.cssText = `
        position:fixed; pointer-events:none; z-index:9997;
        width:500px; height:500px; border-radius:50%;
        background:radial-gradient(circle, rgba(91,110,245,0.07) 0%, transparent 70%);
        transform:translate(-50%,-50%);
        transition:left 1s cubic-bezier(0.4,0,0.2,1),
                   top 1s cubic-bezier(0.4,0,0.2,1),
                   opacity 0.4s;
        opacity:0;
    `;
    document.body.appendChild(glow);

    window.addEventListener('mousemove', e => {
        glow.style.left    = e.clientX + 'px';
        glow.style.top     = e.clientY + 'px';
        glow.style.opacity = '1';
    });
    window.addEventListener('mouseleave', () => { glow.style.opacity = '0'; });
}

// ── 5. Smooth anchor scroll ───────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        const t = document.querySelector(a.getAttribute('href'));
        if (!t) return;
        e.preventDefault();
        t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

// ── 6. Header scroll ─────────────────────────────────────────
const header = document.getElementById('nc-header');
if (header) {
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initReveal();
    initParallax();
    initCursorGlow();
});

})();
