const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs   = require('fs').promises;
const { exec } = require('child_process');

let win;

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 1400, height: 900,
    minWidth: 900, minHeight: 600,
    backgroundColor: '#1e1e1e',
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.loadFile('index.html');
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// File system
ipcMain.handle('fs:read',    async (e, p) => { try { return { ok: true,  data: await fs.readFile(p, 'utf-8') }; } catch(err) { return { ok: false, err: err.message }; } });
ipcMain.handle('fs:write',   async (e, p, d) => { try { await fs.writeFile(p, d, 'utf-8'); return { ok: true }; } catch(err) { return { ok: false, err: err.message }; } });
ipcMain.handle('fs:readdir', async (e, p) => { try { const items = await fs.readdir(p, { withFileTypes: true }); return { ok: true, items: items.map(i => ({ name: i.name, isDir: i.isDirectory(), path: path.join(p, i.name) })) }; } catch(err) { return { ok: false, err: err.message }; } });

// Dialogs
ipcMain.handle('dialog:openFile',   async () => { const r = await dialog.showOpenDialog(win, { properties: ['openFile'] }); return r.canceled ? null : r.filePaths[0]; });
ipcMain.handle('dialog:openFolder', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] }); return r.canceled ? null : r.filePaths[0]; });
ipcMain.handle('dialog:saveFile',   async (e, defaultPath) => { const r = await dialog.showSaveDialog(win, { defaultPath }); return r.canceled ? null : r.filePath; });

// Shell
ipcMain.handle('shell:run', (e, cmd, cwd) => new Promise(resolve => {
  exec(cmd, { cwd: cwd || process.cwd(), timeout: 30000 }, (error, stdout, stderr) => {
    resolve({ stdout: stdout || '', stderr: stderr || '', error: error?.message || null });
  });
}));

// Window controls
ipcMain.handle('win:minimize', () => win.minimize());
ipcMain.handle('win:maximize', () => win.isMaximized() ? win.unmaximize() : win.maximize());
ipcMain.handle('win:close',    () => win.close());
