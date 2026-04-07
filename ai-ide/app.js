// ── STATE ──
const state = {
  openFolder: null,
  files: {},        // path -> { content, modified, lang }
  activeFile: null,
  tabs: [],
  history: [],      // undo/redo per file
  settings: {},
  searchOpts: { case: false, word: false, regex: false },
  aiVisible: true,
  panelVisible: false,
  panelTab: 'terminal',
  termHistory: [],
  termHistIdx: -1,
  gitChanges: [],
  lineHeight: 19.5,
};

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  renderTabs();
  updateLineNumbers();
  updateMinimap();
  loadRecent();
  setupKeyBindings();
  initTerminal();
  loadExtensions();
  document.getElementById('editor').addEventListener('scroll', syncScroll);
  document.getElementById('editor').addEventListener('click', updateCursor);
  document.addEventListener('click', closeAllMenus);
  notify('Welcome to AI Chat IDE', 'info');
});

// ── SETTINGS ──
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('ide_settings') || '{}');
    state.settings = { groqKey: '', model: 'llama-3.1-8b-instant', fontSize: 13, tabSize: 4, wordWrap: 'off', theme: 'dark', ...s };
  } catch { state.settings = { groqKey: '', model: 'llama-3.1-8b-instant', fontSize: 13, tabSize: 4, wordWrap: 'off', theme: 'dark' }; }
  applyEditorSettings();
  applyTheme(state.settings.theme);
}

function saveSettings() {
  state.settings.groqKey = document.getElementById('groqKeyInput').value.trim();
  state.settings.model = document.getElementById('defaultModel').value;
  state.settings.fontSize = parseInt(document.getElementById('fontSizeInput').value) || 13;
  state.settings.tabSize = parseInt(document.getElementById('tabSizeInput').value) || 4;
  state.settings.wordWrap = document.getElementById('wordWrapInput').value;
  state.settings.theme = document.getElementById('themeSelect').value;
  localStorage.setItem('ide_settings', JSON.stringify(state.settings));
  applyEditorSettings();
  applyTheme(state.settings.theme);
  closeSettings();
  notify('Settings saved', 'success');
}

function applyEditorSettings() {
  const ed = document.getElementById('editor');
  const ln = document.getElementById('lineNumbers');
  ed.style.fontSize = state.settings.fontSize + 'px';
  ln.style.fontSize = state.settings.fontSize + 'px';
  ed.style.tabSize = state.settings.tabSize;
  ed.style.whiteSpace = state.settings.wordWrap === 'on' ? 'pre-wrap' : 'pre';
  state.lineHeight = state.settings.fontSize * 1.5;
  document.getElementById('modelSelect').value = state.settings.model;
}

function applyTheme(t) {
  document.body.className = document.body.className.replace(/theme-\w+/g, '');
  if (t && t !== 'dark') document.body.classList.add('theme-' + t);
  state.settings.theme = t;
}

function openSettings() {
  document.getElementById('groqKeyInput').value = state.settings.groqKey || '';
  document.getElementById('defaultModel').value = state.settings.model || 'llama-3.3-70b-versatile';
  document.getElementById('fontSizeInput').value = state.settings.fontSize || 13;
  document.getElementById('tabSizeInput').value = state.settings.tabSize || 4;
  document.getElementById('wordWrapInput').value = state.settings.wordWrap || 'off';
  document.getElementById('themeSelect').value = state.settings.theme || 'dark';
  document.getElementById('settingsModal').classList.add('open');
}
function closeSettings() { document.getElementById('settingsModal').classList.remove('open'); }

function setSettingsTab(tab, btn) {
  document.querySelectorAll('.stab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.stab').forEach(el => el.classList.remove('active'));
  document.getElementById('stab-' + tab).style.display = 'block';
  btn.classList.add('active');
}

// ── ACTIVITY BAR ──
function setActivity(name) {
  document.querySelectorAll('.ab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('ab-' + name)?.classList.add('active');
  document.querySelectorAll('.side-panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('panel-' + name);
  const sidebar = document.getElementById('sidebar');
  if (panel && sidebar.dataset.active === name) {
    sidebar.style.width = '0';
    sidebar.dataset.active = '';
  } else if (panel) {
    panel.style.display = 'flex';
    sidebar.style.width = 'var(--sb-w)';
    sidebar.dataset.active = name;
  }
}

// ── FILE SYSTEM ──
async function openFolder() {
  const path = await window.electronAPI?.openFolder();
  if (!path) return;
  state.openFolder = path;
  document.getElementById('titlebarFile').textContent = path.split(/[\\/]/).pop();
  await loadTree(path, document.getElementById('fileTree'), 0);
  addRecent(path);
  notify('Opened: ' + path.split(/[\\/]/).pop(), 'info');
}

async function loadTree(dirPath, container, depth) {
  container.innerHTML = '';
  const result = await window.electronAPI?.readdir(dirPath);
  if (!result?.ok) { container.innerHTML = '<div class="tree-empty">Cannot read folder</div>'; return; }
  const items = result.items.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  items.forEach(item => {
    if (item.name.startsWith('.') && depth === 0 && item.name !== '.gitignore') return;
    const row = document.createElement('div');
    row.className = 'tree-item' + (item.isDir ? ' dir' : '');
    row.style.paddingLeft = (depth * 12 + 8) + 'px';
    row.dataset.path = item.path;
    row.dataset.isDir = item.isDir;
    const arrow = document.createElement('span');
    arrow.className = 'tree-arrow';
    arrow.textContent = item.isDir ? '▶' : '';
    const icon = document.createElement('span');
    icon.className = 'tree-icon';
    icon.textContent = item.isDir ? '📁' : getFileIcon(item.name);
    const label = document.createElement('span');
    label.className = 'tree-label';
    label.textContent = item.name;
    row.appendChild(arrow);
    row.appendChild(icon);
    row.appendChild(label);
    row.addEventListener('click', (e) => { e.stopPropagation(); treeItemClick(row, item, depth, container); });
    row.addEventListener('contextmenu', (e) => { e.preventDefault(); showTreeContextMenu(e, item); });
    container.appendChild(row);
    if (item.isDir) {
      const children = document.createElement('div');
      children.className = 'tree-children';
      children.style.display = 'none';
      container.appendChild(children);
      row._children = children;
    }
  });
}

async function treeItemClick(row, item, depth, container) {
  if (item.isDir) {
    const children = row._children;
    if (!children) return;
    const open = children.style.display !== 'none';
    children.style.display = open ? 'none' : 'block';
    row.querySelector('.tree-arrow').textContent = open ? '▶' : '▼';
    row.querySelector('.tree-icon').textContent = open ? '📁' : '📂';
    if (!open && children.children.length === 0) {
      await loadTree(item.path, children, depth + 1);
    }
  } else {
    document.querySelectorAll('.tree-item').forEach(i => i.classList.remove('active'));
    row.classList.add('active');
    await openFile(item.path);
  }
}

async function openFile(path) {
  if (state.files[path]) {
    setActiveTab(path);
    return;
  }
  const result = await window.electronAPI?.readFile(path);
  if (!result?.ok) { notify('Cannot open file: ' + result?.err, 'error'); return; }
  const content = result.data;
  const lang = detectLang(path);
  state.files[path] = { content, modified: false, lang, savedContent: content };
  if (!state.tabs.includes(path)) state.tabs.push(path);
  setActiveTab(path);
  addRecent(path);
}

function setActiveTab(path) {
  state.activeFile = path;
  const f = state.files[path];
  document.getElementById('editor').value = f.content;
  document.getElementById('welcomeScreen').classList.add('hidden');
  updateLineNumbers();
  updateMinimap();
  updateBreadcrumbs(path);
  updateStatusBar(path);
  document.getElementById('aiContextFile').textContent = path.split(/[\\/]/).pop();
  renderTabs();
  updateCursor();
}

async function saveFile(path) {
  if (!path) path = state.activeFile;
  if (!path) return;
  const f = state.files[path];
  if (!f) return;
  const content = document.getElementById('editor').value;
  f.content = content;
  const result = await window.electronAPI?.writeFile(path, content);
  if (result?.ok) {
    f.modified = false;
    f.savedContent = content;
    renderTabs();
    notify('Saved: ' + path.split(/[\\/]/).pop(), 'success');
  } else {
    notify('Save failed: ' + result?.err, 'error');
  }
}

async function saveFileAs() {
  const savePath = await window.electronAPI?.saveFile(state.activeFile || 'untitled.txt');
  if (!savePath) return;
  const content = document.getElementById('editor').value;
  const result = await window.electronAPI?.writeFile(savePath, content);
  if (result?.ok) {
    if (state.activeFile && state.files[state.activeFile]) {
      state.files[savePath] = { ...state.files[state.activeFile], content, modified: false };
      delete state.files[state.activeFile];
      const idx = state.tabs.indexOf(state.activeFile);
      if (idx >= 0) state.tabs[idx] = savePath;
      state.activeFile = savePath;
    }
    renderTabs();
    notify('Saved as: ' + savePath.split(/[\\/]/).pop(), 'success');
  }
}

function newFile() {
  const path = '__new__' + Date.now();
  state.files[path] = { content: '', modified: false, lang: 'plaintext', savedContent: '', isNew: true };
  state.tabs.push(path);
  setActiveTab(path);
}

function closeTab(path, e) {
  if (e) e.stopPropagation();
  const f = state.files[path];
  if (f?.modified) {
    if (!confirm('File has unsaved changes. Close anyway?')) return;
  }
  const idx = state.tabs.indexOf(path);
  state.tabs.splice(idx, 1);
  delete state.files[path];
  if (state.activeFile === path) {
    state.activeFile = state.tabs[Math.min(idx, state.tabs.length - 1)] || null;
    if (state.activeFile) setActiveTab(state.activeFile);
    else {
      document.getElementById('editor').value = '';
      document.getElementById('welcomeScreen').classList.remove('hidden');
      updateLineNumbers();
    }
  }
  renderTabs();
}

// ── TABS ──
function renderTabs() {
  const list = document.getElementById('tabsList');
  if (state.tabs.length === 0) {
    list.innerHTML = '<div class="tabs-empty">No files open</div>';
    return;
  }
  list.innerHTML = '';
  state.tabs.forEach(path => {
    const f = state.files[path];
    const name = path.startsWith('__new__') ? 'Untitled' : path.split(/[\\/]/).pop();
    const tab = document.createElement('div');
    tab.className = 'tab' + (path === state.activeFile ? ' active' : '') + (f?.modified ? ' modified' : '');
    tab.innerHTML = `<span class="tab-icon">${getFileIcon(name)}</span><span class="tab-name">${name}</span><span class="tab-close" onclick="closeTab('${path}',event)">×</span>`;
    tab.addEventListener('click', () => setActiveTab(path));
    tab.addEventListener('contextmenu', (e) => { e.preventDefault(); showTabContextMenu(e, path); });
    list.appendChild(tab);
  });
}

// ── EDITOR ──
function onEditorInput(e) {
  if (!state.activeFile) return;
  const f = state.files[state.activeFile];
  f.content = e.target.value;
  f.modified = f.content !== f.savedContent;
  renderTabs();
  updateLineNumbers();
  updateMinimap();
  updateCursor();
}

function updateLineNumbers() {
  const ed = document.getElementById('editor');
  const ln = document.getElementById('lineNumbers');
  const lines = ed.value.split('\n').length;
  let html = '';
  for (let i = 1; i <= lines; i++) html += i + '\n';
  ln.textContent = html;
  ln.scrollTop = ed.scrollTop;
}

function syncScroll() {
  const ed = document.getElementById('editor');
  document.getElementById('lineNumbers').scrollTop = ed.scrollTop;
  updateMinimapViewport();
}

function updateCursor() {
  const ed = document.getElementById('editor');
  const val = ed.value.substring(0, ed.selectionStart);
  const lines = val.split('\n');
  const ln = lines.length;
  const col = lines[lines.length - 1].length + 1;
  document.getElementById('sbPos').textContent = `Ln ${ln}, Col ${col}`;
}

function handleEditorKey(e) {
  const ed = e.target;
  // Tab key
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = ed.selectionStart, end = ed.selectionEnd;
    const spaces = ' '.repeat(state.settings.tabSize || 4);
    if (e.shiftKey) {
      // Unindent
      const before = ed.value.substring(0, start);
      const lineStart = before.lastIndexOf('\n') + 1;
      const lineContent = ed.value.substring(lineStart);
      if (lineContent.startsWith(spaces)) {
        ed.value = ed.value.substring(0, lineStart) + lineContent.substring(spaces.length);
        ed.selectionStart = ed.selectionEnd = Math.max(lineStart, start - spaces.length);
      }
    } else {
      ed.value = ed.value.substring(0, start) + spaces + ed.value.substring(end);
      ed.selectionStart = ed.selectionEnd = start + spaces.length;
    }
    onEditorInput({ target: ed });
    return;
  }
  // Auto-close brackets
  const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
  if (pairs[e.key] && !e.ctrlKey && !e.metaKey) {
    const start = ed.selectionStart, end = ed.selectionEnd;
    if (start === end) {
      e.preventDefault();
      const close = pairs[e.key];
      ed.value = ed.value.substring(0, start) + e.key + close + ed.value.substring(end);
      ed.selectionStart = ed.selectionEnd = start + 1;
      onEditorInput({ target: ed });
    }
    return;
  }
  // Enter - auto indent
  if (e.key === 'Enter') {
    const start = ed.selectionStart;
    const before = ed.value.substring(0, start);
    const lineStart = before.lastIndexOf('\n') + 1;
    const line = before.substring(lineStart);
    const indent = line.match(/^(\s*)/)[1];
    const lastChar = line.trimEnd().slice(-1);
    const extraIndent = ['{', '(', '['].includes(lastChar) ? ' '.repeat(state.settings.tabSize || 4) : '';
    if (indent || extraIndent) {
      e.preventDefault();
      const ins = '\n' + indent + extraIndent;
      ed.value = ed.value.substring(0, start) + ins + ed.value.substring(ed.selectionEnd);
      ed.selectionStart = ed.selectionEnd = start + ins.length;
      onEditorInput({ target: ed });
    }
  }
}

function updateBreadcrumbs(path) {
  const bc = document.getElementById('breadcrumbs');
  if (!path || path.startsWith('__new__')) { bc.innerHTML = ''; return; }
  const parts = path.replace(/\\/g, '/').split('/');
  bc.innerHTML = parts.map((p, i) =>
    `<span class="bc-item" onclick="bcClick(${i})">${p}</span>${i < parts.length - 1 ? '<span class="bc-sep">›</span>' : ''}`
  ).join('');
}

function updateStatusBar(path) {
  if (!path || path.startsWith('__new__')) {
    document.getElementById('sbLang').textContent = 'Plain Text';
    return;
  }
  const f = state.files[path];
  const langNames = { js:'JavaScript', ts:'TypeScript', py:'Python', html:'HTML', css:'CSS', json:'JSON', md:'Markdown', txt:'Plain Text', jsx:'JavaScript React', tsx:'TypeScript React', cpp:'C++', c:'C', java:'Java', rs:'Rust', go:'Go', php:'PHP', rb:'Ruby', sh:'Shell Script', yaml:'YAML', yml:'YAML', xml:'XML', sql:'SQL' };
  const ext = path.split('.').pop().toLowerCase();
  document.getElementById('sbLang').textContent = langNames[ext] || 'Plain Text';
}

function updateMinimap() {
  const ed = document.getElementById('editor');
  const mm = document.getElementById('minimap');
  const content = document.createElement('div');
  content.className = 'minimap-content';
  content.textContent = ed.value.substring(0, 3000);
  mm.innerHTML = '';
  mm.appendChild(content);
  updateMinimapViewport();
}

function updateMinimapViewport() {
  const ed = document.getElementById('editor');
  const mm = document.getElementById('minimap');
  let vp = mm.querySelector('.minimap-viewport');
  if (!vp) { vp = document.createElement('div'); vp.className = 'minimap-viewport'; mm.appendChild(vp); }
  const ratio = mm.clientHeight / (ed.scrollHeight || 1);
  const top = ed.scrollTop * ratio;
  const height = ed.clientHeight * ratio;
  vp.style.top = top + 'px';
  vp.style.height = height + 'px';
}

// ── SEARCH ──
function searchFiles() {
  const query = document.getElementById('searchInput').value;
  const results = document.getElementById('searchResults');
  if (!query) { results.innerHTML = ''; return; }
  let html = '';
  let count = 0;
  Object.entries(state.files).forEach(([path, f]) => {
    const name = path.split(/[\\/]/).pop();
    const lines = f.content.split('\n');
    const matches = [];
    lines.forEach((line, i) => {
      let match = false;
      try {
        if (state.searchOpts.regex) match = new RegExp(query, state.searchOpts.case ? '' : 'i').test(line);
        else if (state.searchOpts.case) match = line.includes(query);
        else match = line.toLowerCase().includes(query.toLowerCase());
        if (state.searchOpts.word && match) {
          const re = new RegExp('\\b' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', state.searchOpts.case ? '' : 'i');
          match = re.test(line);
        }
      } catch {}
      if (match) matches.push({ line: i + 1, text: line.trim() });
    });
    if (matches.length) {
      html += `<div class="search-result-file" onclick="openFile('${path}')">${name} (${matches.length})</div>`;
      matches.slice(0, 5).forEach(m => {
        const hl = m.text.replace(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), s => `<mark>${s}</mark>`);
        html += `<div class="search-result-line" onclick="openFile('${path}')">${m.line}: ${hl}</div>`;
      });
      count++;
    }
  });
  results.innerHTML = html || `<div class="tree-empty">No results for "${query}"</div>`;
}

function toggleSearchOpt(opt) {
  state.searchOpts[opt] = !state.searchOpts[opt];
  document.getElementById('search' + opt.charAt(0).toUpperCase() + opt.slice(1))?.classList.toggle('active', state.searchOpts[opt]);
  searchFiles();
}

function replaceAll() {
  const query = document.getElementById('searchInput').value;
  const replace = document.getElementById('replaceInput').value;
  if (!query || !state.activeFile) return;
  const ed = document.getElementById('editor');
  const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g' + (state.searchOpts.case ? '' : 'i'));
  ed.value = ed.value.replace(re, replace);
  onEditorInput({ target: ed });
  notify('Replaced all occurrences', 'success');
}

// ── COMMAND PALETTE ──
const COMMANDS = [
  { label: 'File: Open Folder', action: openFolder, shortcut: 'Ctrl+K Ctrl+O' },
  { label: 'File: New File', action: newFile, shortcut: 'Ctrl+N' },
  { label: 'File: Save', action: () => saveFile(), shortcut: 'Ctrl+S' },
  { label: 'File: Save As', action: saveFileAs, shortcut: 'Ctrl+Shift+S' },
  { label: 'View: Toggle AI Panel', action: toggleAIPanel, shortcut: 'Ctrl+Shift+A' },
  { label: 'View: Toggle Terminal', action: togglePanel, shortcut: 'Ctrl+`' },
  { label: 'View: Toggle Sidebar', action: () => setActivity('explorer'), shortcut: 'Ctrl+B' },
  { label: 'Settings: Open Settings', action: openSettings, shortcut: 'Ctrl+,' },
  { label: 'Editor: Go to Line', action: gotoLine, shortcut: 'Ctrl+G' },
  { label: 'Editor: Format Document', action: formatDocument },
  { label: 'Theme: Dark+', action: () => applyTheme('dark') },
  { label: 'Theme: One Dark Pro', action: () => applyTheme('darker') },
  { label: 'Theme: Light+', action: () => applyTheme('light') },
  { label: 'Theme: Monokai', action: () => applyTheme('monokai') },
  { label: 'Theme: Solarized Dark', action: () => applyTheme('solarized') },
  { label: 'Terminal: New Terminal', action: () => { togglePanel(true); setPanelTab('terminal'); } },
  { label: 'Help: Keyboard Shortcuts', action: showShortcuts },
];

function openCommandPalette() {
  document.getElementById('cmdOverlay').classList.add('open');
  document.getElementById('cmdInput').value = '';
  filterCommands();
  setTimeout(() => document.getElementById('cmdInput').focus(), 50);
}
function closeCommandPalette() { document.getElementById('cmdOverlay').classList.remove('open'); }

function filterCommands() {
  const q = document.getElementById('cmdInput').value.toLowerCase();
  const results = document.getElementById('cmdResults');
  const filtered = q ? COMMANDS.filter(c => c.label.toLowerCase().includes(q)) : COMMANDS;
  results.innerHTML = filtered.map((c, i) =>
    `<div class="cmd-item" data-idx="${i}" onclick="runCommand(${COMMANDS.indexOf(c)})">
      <span class="cmd-item-label">${c.label}</span>
      ${c.shortcut ? `<span class="cmd-item-desc">${c.shortcut}</span>` : ''}
    </div>`
  ).join('') || '<div class="cmd-item disabled">No commands found</div>';
}

function runCommand(idx) {
  closeCommandPalette();
  COMMANDS[idx]?.action();
}

let cmdSelectedIdx = 0;
function cmdKeydown(e) {
  const items = document.querySelectorAll('.cmd-item');
  if (e.key === 'ArrowDown') { cmdSelectedIdx = Math.min(cmdSelectedIdx + 1, items.length - 1); highlightCmd(items); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { cmdSelectedIdx = Math.max(cmdSelectedIdx - 1, 0); highlightCmd(items); e.preventDefault(); }
  else if (e.key === 'Enter') { items[cmdSelectedIdx]?.click(); }
  else if (e.key === 'Escape') closeCommandPalette();
}
function highlightCmd(items) {
  items.forEach((el, i) => el.classList.toggle('selected', i === cmdSelectedIdx));
  items[cmdSelectedIdx]?.scrollIntoView({ block: 'nearest' });
}

// ── KEYBOARD SHORTCUTS ──
function setupKeyBindings() {
  document.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.shiftKey && e.key === 'P') { e.preventDefault(); openCommandPalette(); }
    else if (ctrl && e.key === 's' && !e.shiftKey) { e.preventDefault(); saveFile(); }
    else if (ctrl && e.shiftKey && e.key === 'S') { e.preventDefault(); saveFileAs(); }
    else if (ctrl && e.key === 'n') { e.preventDefault(); newFile(); }
    else if (ctrl && e.key === 'b') { e.preventDefault(); setActivity('explorer'); }
    else if (ctrl && e.key === ',') { e.preventDefault(); openSettings(); }
    else if (ctrl && e.key === '`') { e.preventDefault(); togglePanel(); }
    else if (ctrl && e.shiftKey && e.key === 'E') { e.preventDefault(); setActivity('explorer'); }
    else if (ctrl && e.shiftKey && e.key === 'F') { e.preventDefault(); setActivity('search'); }
    else if (ctrl && e.shiftKey && e.key === 'G') { e.preventDefault(); setActivity('git'); }
    else if (ctrl && e.shiftKey && e.key === 'X') { e.preventDefault(); setActivity('extensions'); }
    else if (ctrl && e.shiftKey && e.key === 'A') { e.preventDefault(); toggleAIPanel(); }
    else if (ctrl && e.key === 'g') { e.preventDefault(); gotoLine(); }
    else if (ctrl && e.key === 'w') { e.preventDefault(); if (state.activeFile) closeTab(state.activeFile); }
    else if (ctrl && e.key === 'z') { /* handled by browser */ }
    else if (e.key === 'F1') { e.preventDefault(); openCommandPalette(); }
    else if (e.key === 'Escape') { closeCommandPalette(); closeAllMenus(); }
  });
}

// ── MENUS ──
const MENUS = {
  file: [
    { label: 'New File', shortcut: 'Ctrl+N', action: newFile },
    { label: 'Open Folder...', shortcut: 'Ctrl+K Ctrl+O', action: openFolder },
    { sep: true },
    { label: 'Save', shortcut: 'Ctrl+S', action: () => saveFile() },
    { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: saveFileAs },
    { sep: true },
    { label: 'Close Editor', shortcut: 'Ctrl+W', action: () => { if (state.activeFile) closeTab(state.activeFile); } },
  ],
  edit: [
    { label: 'Undo', shortcut: 'Ctrl+Z', action: () => document.execCommand('undo') },
    { label: 'Redo', shortcut: 'Ctrl+Y', action: () => document.execCommand('redo') },
    { sep: true },
    { label: 'Cut', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
    { label: 'Copy', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
    { label: 'Paste', shortcut: 'Ctrl+V', action: () => document.execCommand('paste') },
    { sep: true },
    { label: 'Find', shortcut: 'Ctrl+F', action: () => setActivity('search') },
    { label: 'Replace', shortcut: 'Ctrl+H', action: () => setActivity('search') },
    { label: 'Go to Line...', shortcut: 'Ctrl+G', action: gotoLine },
  ],
  selection: [
    { label: 'Select All', shortcut: 'Ctrl+A', action: () => { document.getElementById('editor').select(); } },
    { label: 'Expand Selection', shortcut: 'Shift+Alt+→', action: () => {} },
  ],
  view: [
    { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: openCommandPalette },
    { sep: true },
    { label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: () => setActivity('explorer') },
    { label: 'Search', shortcut: 'Ctrl+Shift+F', action: () => setActivity('search') },
    { label: 'Source Control', shortcut: 'Ctrl+Shift+G', action: () => setActivity('git') },
    { label: 'Extensions', shortcut: 'Ctrl+Shift+X', action: () => setActivity('extensions') },
    { sep: true },
    { label: 'Toggle AI Panel', shortcut: 'Ctrl+Shift+A', action: toggleAIPanel },
    { label: 'Toggle Terminal', shortcut: 'Ctrl+`', action: togglePanel },
    { sep: true },
    { label: 'Settings', shortcut: 'Ctrl+,', action: openSettings },
  ],
  go: [
    { label: 'Go to File...', shortcut: 'Ctrl+P', action: openCommandPalette },
    { label: 'Go to Line...', shortcut: 'Ctrl+G', action: gotoLine },
  ],
  run: [
    { label: 'Run File', shortcut: 'F5', action: runCurrentFile },
  ],
  terminal: [
    { label: 'New Terminal', shortcut: 'Ctrl+`', action: () => { togglePanel(true); setPanelTab('terminal'); } },
    { label: 'Clear Terminal', action: clearTerminal },
  ],
  help: [
    { label: 'Keyboard Shortcuts', action: showShortcuts },
    { label: 'About AI Chat IDE', action: () => notify('AI Chat IDE v1.0 — Powered by AI Chat Pro', 'info') },
  ],
};

function showMenu(name, el) {
  closeAllMenus();
  const menu = MENUS[name];
  if (!menu) return;
  const dm = document.getElementById('dropdownMenu');
  dm.innerHTML = menu.map(item =>
    item.sep ? '<div class="dm-sep"></div>' :
    `<div class="dm-item" onclick="menuItemClick('${name}',${menu.indexOf(item)})">${item.label}${item.shortcut ? `<span class="dm-shortcut">${item.shortcut}</span>` : ''}</div>`
  ).join('');
  const rect = el.getBoundingClientRect();
  dm.style.left = rect.left + 'px';
  dm.style.top = rect.bottom + 'px';
  dm.style.display = 'block';
  el.classList.add('open');
  dm._menuName = name;
  dm._menuEl = el;
}

function menuItemClick(name, idx) {
  closeAllMenus();
  MENUS[name][idx]?.action?.();
}

function closeAllMenus() {
  document.getElementById('dropdownMenu').style.display = 'none';
  document.querySelectorAll('.tm.open').forEach(el => el.classList.remove('open'));
  document.getElementById('contextMenu').style.display = 'none';
}

// ── CONTEXT MENUS ──
function showTreeContextMenu(e, item) {
  const cm = document.getElementById('contextMenu');
  const items = item.isDir ? [
    { label: 'New File', action: () => newFileInDir(item.path) },
    { label: 'New Folder', action: () => newFolderInDir(item.path) },
    { sep: true },
    { label: 'Rename', action: () => renameItem(item) },
    { label: 'Delete', action: () => deleteItem(item) },
    { sep: true },
    { label: 'Copy Path', action: () => navigator.clipboard.writeText(item.path) },
  ] : [
    { label: 'Open', action: () => openFile(item.path) },
    { sep: true },
    { label: 'Rename', action: () => renameItem(item) },
    { label: 'Delete', action: () => deleteItem(item) },
    { sep: true },
    { label: 'Copy Path', action: () => navigator.clipboard.writeText(item.path) },
    { label: 'Copy Relative Path', action: () => navigator.clipboard.writeText(item.path.replace(state.openFolder + '/', '')) },
  ];
  cm.innerHTML = items.map((it, i) =>
    it.sep ? '<div class="ctx-sep"></div>' :
    `<div class="ctx-item" onclick="ctxAction(${i})">${it.label}</div>`
  ).join('');
  cm._actions = items;
  cm.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
  cm.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
  cm.style.display = 'block';
}

function showTabContextMenu(e, path) {
  const cm = document.getElementById('contextMenu');
  const items = [
    { label: 'Close', action: () => closeTab(path) },
    { label: 'Close Others', action: () => { state.tabs.filter(t => t !== path).forEach(t => closeTab(t)); } },
    { label: 'Close All', action: () => { [...state.tabs].forEach(t => closeTab(t)); } },
    { sep: true },
    { label: 'Copy Path', action: () => navigator.clipboard.writeText(path) },
  ];
  cm.innerHTML = items.map((it, i) =>
    it.sep ? '<div class="ctx-sep"></div>' :
    `<div class="ctx-item" onclick="ctxAction(${i})">${it.label}</div>`
  ).join('');
  cm._actions = items;
  cm.style.left = e.clientX + 'px';
  cm.style.top = e.clientY + 'px';
  cm.style.display = 'block';
}

function ctxAction(idx) {
  const cm = document.getElementById('contextMenu');
  cm._actions[idx]?.action?.();
  cm.style.display = 'none';
}

// ── TERMINAL ──
function initTerminal() {
  const prompt = document.getElementById('termPrompt');
  if (state.openFolder) prompt.textContent = state.openFolder.split(/[\\/]/).pop() + ' $ ';
  termPrint('AI Chat IDE Terminal', 'info');
  termPrint('Type commands below. Note: runs via Electron IPC.', 'info');
  termPrint('', '');
}

function termPrint(text, type) {
  const out = document.getElementById('termOutput');
  const line = document.createElement('div');
  line.className = 'term-line' + (type ? ' ' + type : '');
  line.textContent = text;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}

async function termKeydown(e) {
  const input = document.getElementById('termInput');
  if (e.key === 'Enter') {
    const cmd = input.value.trim();
    if (!cmd) return;
    state.termHistory.unshift(cmd);
    state.termHistIdx = -1;
    termPrint('$ ' + cmd, 'cmd');
    input.value = '';
    await runTermCmd(cmd);
  } else if (e.key === 'ArrowUp') {
    state.termHistIdx = Math.min(state.termHistIdx + 1, state.termHistory.length - 1);
    input.value = state.termHistory[state.termHistIdx] || '';
    e.preventDefault();
  } else if (e.key === 'ArrowDown') {
    state.termHistIdx = Math.max(state.termHistIdx - 1, -1);
    input.value = state.termHistIdx >= 0 ? state.termHistory[state.termHistIdx] : '';
    e.preventDefault();
  } else if (e.key === 'l' && e.ctrlKey) {
    clearTerminal(); e.preventDefault();
  }
}

async function runTermCmd(cmd) {
  if (cmd === 'clear' || cmd === 'cls') { clearTerminal(); return; }
  if (cmd.startsWith('echo ')) { termPrint(cmd.slice(5), ''); return; }
  const result = await window.electronAPI?.runCommand(cmd, state.openFolder);
  if (result) {
    if (result.stdout) result.stdout.split('\n').forEach(l => l && termPrint(l, ''));
    if (result.stderr) result.stderr.split('\n').forEach(l => l && termPrint(l, 'err'));
    if (result.error) termPrint(result.error, 'err');
  } else {
    termPrint('Command executed (no output)', 'info');
  }
}

function clearTerminal() {
  document.getElementById('termOutput').innerHTML = '';
  termPrint('Terminal cleared', 'info');
}

function togglePanel(forceOpen) {
  const pa = document.getElementById('panelArea');
  const show = forceOpen || pa.style.display === 'none';
  pa.style.display = show ? 'flex' : 'none';
  state.panelVisible = show;
  if (show) {
    document.getElementById('termInput').focus();
  }
}

function setPanelTab(tab) {
  state.panelTab = tab;
  document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('ptab-' + tab)?.classList.add('active');
  document.querySelectorAll('.terminal-pane, .problems-pane, .output-pane').forEach(p => p.style.display = 'none');
  document.getElementById('pane-' + tab).style.display = 'flex';
}

function runCurrentFile() {
  if (!state.activeFile) return;
  const ext = state.activeFile.split('.').pop().toLowerCase();
  const cmds = { py: 'python', js: 'node', ts: 'ts-node', rb: 'ruby', php: 'php', go: 'go run', rs: 'cargo run' };
  const runner = cmds[ext];
  if (!runner) { notify('No runner for this file type', 'error'); return; }
  togglePanel(true);
  setPanelTab('terminal');
  runTermCmd(`${runner} "${state.activeFile}"`);
}

// ── AI PANEL ──
function toggleAIPanel() {
  const panel = document.getElementById('aiPanel');
  state.aiVisible = !state.aiVisible;
  panel.classList.toggle('hidden', !state.aiVisible);
}

async function sendAI() {
  const input = document.getElementById('aiInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  autoResize(input);
  addAIMessage('user', msg);
  const typingId = addTyping();

  // Try to get key: settings first, then fetch from server
  let key = state.settings.groqKey;
  if (!key) {
    try {
      const r = await fetch('https://aichatcompany.up.railway.app/api/config/groq-key', {
        credentials: 'include'
      });
      if (r.ok) { const d = await r.json(); key = d.key; if (key) state.settings.groqKey = key; }
    } catch (_) {}
  }
  if (!key) {
    removeTyping(typingId);
    addAIMessage('ai', '🔑 No API key found. Open Settings (Ctrl+,) and enter your Groq key.\n\nGet a free key at console.groq.com');
    setTimeout(() => openSettings(), 600);
    return;
  }

  const model = document.getElementById('modelSelect').value;
  const fileCtx = state.activeFile && state.files[state.activeFile]
    ? `\n\nCurrent file: ${state.activeFile.split(/[\\/]/).pop()}\n\`\`\`\n${state.files[state.activeFile].content.substring(0, 4000)}\n\`\`\``
    : '';
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are an expert coding assistant in an IDE. Help with code, explain concepts, find bugs, and suggest improvements. Format code in markdown code blocks.' + fileCtx },
          { role: 'user', content: msg }
        ],
        max_tokens: 2048, temperature: 0.7,
      })
    });
    removeTyping(typingId);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        addAIMessage('ai', '🔑 Invalid or expired API key. Open Settings (Ctrl+,) and enter a valid Groq key from console.groq.com');
        setTimeout(() => openSettings(), 800);
      } else if (res.status === 429) {
        addAIMessage('ai', '⏳ Rate limit reached. Wait a moment and try again.');
      } else {
        addAIMessage('ai', 'Error: ' + (err.error?.message || res.statusText));
      }
      return;
    }
    const data = await res.json();
    const reply = data.choices[0].message.content;
    addAIMessage('ai', reply);
  } catch (err) {
    removeTyping(typingId);
    addAIMessage('ai', 'Network error: ' + err.message);
  }
}

function addAIMessage(role, text) {
  const msgs = document.getElementById('aiMessages');
  const div = document.createElement('div');
  div.className = 'ai-msg ' + role;
  const av = document.createElement('div');
  av.className = 'ai-av';
  av.textContent = role === 'ai' ? 'AI' : 'U';
  const body = document.createElement('div');
  body.className = 'ai-body';
  const textDiv = document.createElement('div');
  textDiv.className = 'ai-text';
  textDiv.innerHTML = formatAIText(text);
  body.appendChild(textDiv);
  // Add apply buttons for code blocks
  if (role === 'ai') {
    const codeBlocks = textDiv.querySelectorAll('pre code');
    codeBlocks.forEach((block, i) => {
      const btn = document.createElement('button');
      btn.className = 'apply-btn';
      btn.textContent = '⎘ Apply to Editor';
      btn.onclick = () => applyCode(block.textContent);
      block.parentElement.after(btn);
    });
  }
  div.appendChild(av);
  div.appendChild(body);
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function formatAIText(text) {
  // Code blocks
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><button class="copy-code-btn" onclick="copyCode(this)">Copy</button><code class="lang-${lang}">${escHtml(code.trim())}</code></pre>`
  );
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Lists
  text = text.replace(/^- (.+)$/gm, '<li>$1</li>');
  text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  // Paragraphs
  text = text.split('\n\n').map(p => p.startsWith('<') ? p : `<p>${p}</p>`).join('');
  return text;
}

function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function copyCode(btn) {
  const code = btn.nextElementSibling?.textContent || '';
  navigator.clipboard.writeText(code);
  btn.textContent = 'Copied!';
  setTimeout(() => btn.textContent = 'Copy', 2000);
}

function applyCode(code) {
  if (!state.activeFile) { notify('No file open', 'error'); return; }
  const ed = document.getElementById('editor');
  const start = ed.selectionStart, end = ed.selectionEnd;
  if (start !== end) {
    ed.value = ed.value.substring(0, start) + code + ed.value.substring(end);
    ed.selectionStart = ed.selectionEnd = start + code.length;
  } else {
    ed.value += '\n' + code;
  }
  onEditorInput({ target: ed });
  notify('Code applied to editor', 'success');
}

let typingCounter = 0;
function addTyping() {
  const id = 'typing-' + (++typingCounter);
  const msgs = document.getElementById('aiMessages');
  const div = document.createElement('div');
  div.className = 'ai-msg ai';
  div.id = id;
  div.innerHTML = '<div class="ai-av">AI</div><div class="ai-body"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return id;
}
function removeTyping(id) { document.getElementById(id)?.remove(); }

function quickAsk(q) {
  document.getElementById('aiInput').value = q;
  sendAI();
}

function clearChat() {
  document.getElementById('aiMessages').innerHTML = `
    <div class="ai-welcome">
      <div class="ai-welcome-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="ai-welcome-title">AI Chat Pro</div>
      <div class="ai-welcome-sub">I can see your code. Ask me anything.</div>
    </div>`;
}

function aiKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAI(); }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ── UTILITIES ──
function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const icons = {
    js:'🟨', ts:'🔷', jsx:'⚛️', tsx:'⚛️', html:'🌐', css:'🎨', scss:'🎨', less:'🎨',
    json:'📋', md:'📝', txt:'📄', py:'🐍', rb:'💎', php:'🐘', java:'☕', cpp:'⚙️',
    c:'⚙️', h:'⚙️', rs:'🦀', go:'🐹', sh:'🖥️', bat:'🖥️', ps1:'🖥️',
    yaml:'⚙️', yml:'⚙️', xml:'📋', sql:'🗄️', env:'🔒', gitignore:'🔒',
    png:'🖼️', jpg:'🖼️', jpeg:'🖼️', gif:'🖼️', svg:'🖼️', ico:'🖼️',
    pdf:'📕', zip:'📦', tar:'📦', gz:'📦',
    vue:'💚', svelte:'🔥', astro:'🚀',
  };
  return icons[ext] || (name.includes('.') ? '📄' : '📁');
}

function detectLang(path) {
  const ext = path.split('.').pop().toLowerCase();
  const langs = { js:'javascript', ts:'typescript', py:'python', html:'html', css:'css', json:'json', md:'markdown', jsx:'javascript', tsx:'typescript', cpp:'cpp', c:'c', java:'java', rs:'rust', go:'go', php:'php', rb:'ruby', sh:'shell', yaml:'yaml', yml:'yaml', xml:'xml', sql:'sql' };
  return langs[ext] || 'plaintext';
}

function gotoLine() {
  const ln = prompt('Go to line:');
  if (!ln) return;
  const n = parseInt(ln);
  if (isNaN(n)) return;
  const ed = document.getElementById('editor');
  const lines = ed.value.split('\n');
  let pos = 0;
  for (let i = 0; i < Math.min(n - 1, lines.length); i++) pos += lines[i].length + 1;
  ed.focus();
  ed.selectionStart = ed.selectionEnd = pos;
  const lineH = state.lineHeight;
  ed.scrollTop = Math.max(0, (n - 5) * lineH);
  updateCursor();
}

function formatDocument() {
  if (!state.activeFile) return;
  const ed = document.getElementById('editor');
  const ext = state.activeFile.split('.').pop().toLowerCase();
  if (ext === 'json') {
    try {
      ed.value = JSON.stringify(JSON.parse(ed.value), null, state.settings.tabSize || 2);
      onEditorInput({ target: ed });
      notify('Document formatted', 'success');
    } catch { notify('Invalid JSON', 'error'); }
  } else {
    notify('Format: install Prettier for full support', 'info');
  }
}

function changeLang() {
  const lang = prompt('Enter language (js, py, html, css, json, md, etc.):');
  if (lang && state.activeFile) {
    state.files[state.activeFile].lang = lang;
    document.getElementById('sbLang').textContent = lang;
  }
}

function splitEditor() { notify('Split editor coming soon', 'info'); }
function bcClick(idx) {}
function toggleSection(id) {}
function newFolder() { notify('Create folder: right-click in explorer', 'info'); }
function newFileInDir(dir) { notify('New file in: ' + dir, 'info'); }
function newFolderInDir(dir) { notify('New folder in: ' + dir, 'info'); }
function renameItem(item) { notify('Rename: ' + item.name, 'info'); }
function deleteItem(item) { if (confirm('Delete ' + item.name + '?')) notify('Delete not implemented in browser mode', 'info'); }
function collapseAll() { document.querySelectorAll('.tree-children').forEach(c => c.style.display = 'none'); document.querySelectorAll('.tree-arrow').forEach(a => a.textContent = '▶'); }
function gitBranch() { notify('Git: ' + document.getElementById('sbBranchName').textContent, 'info'); }
function gitCommit() { const msg = document.getElementById('gitMsg').value.trim(); if (!msg) { notify('Enter a commit message', 'error'); return; } notify('Committed: ' + msg, 'success'); document.getElementById('gitMsg').value = ''; }
function showShortcuts() { notify('Ctrl+P: Command Palette | Ctrl+S: Save | Ctrl+N: New | Ctrl+`: Terminal | Ctrl+Shift+A: AI', 'info'); }

function loadExtensions() {
  const exts = [
    { name: 'Prettier', desc: 'Code formatter', installed: false },
    { name: 'ESLint', desc: 'JavaScript linter', installed: false },
    { name: 'GitLens', desc: 'Git supercharged', installed: false },
    { name: 'Python', desc: 'Python language support', installed: false },
  ];
  const list = document.getElementById('extList');
  if (!list) return;
  list.innerHTML = exts.map(e =>
    `<div class="ext-item"><div class="ext-name">${e.name}</div><div class="ext-desc">${e.desc}</div></div>`
  ).join('');
}

// ── RECENT FILES ──
function addRecent(path) {
  let recent = JSON.parse(localStorage.getItem('ide_recent') || '[]');
  recent = [path, ...recent.filter(p => p !== path)].slice(0, 10);
  localStorage.setItem('ide_recent', JSON.stringify(recent));
  loadRecent();
}

function loadRecent() {
  const recent = JSON.parse(localStorage.getItem('ide_recent') || '[]');
  const el = document.getElementById('recentFiles');
  if (!el) return;
  el.innerHTML = recent.slice(0, 5).map(p =>
    `<a onclick="openFile('${p}')">${p.split(/[\\/]/).pop()}</a>`
  ).join('') || '<span style="color:var(--text3);font-size:12px">No recent files</span>';
}

// ── NOTIFICATIONS ──
function notify(msg, type = 'info') {
  const n = document.createElement('div');
  n.className = 'notification ' + type;
  n.textContent = msg;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3000);
}
