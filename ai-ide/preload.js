const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readFile:    (p)    => ipcRenderer.invoke('fs:read', p),
  writeFile:   (p, d) => ipcRenderer.invoke('fs:write', p, d),
  readdir:     (p)    => ipcRenderer.invoke('fs:readdir', p),
  openFile:    ()     => ipcRenderer.invoke('dialog:openFile'),
  openFolder:  ()     => ipcRenderer.invoke('dialog:openFolder'),
  saveFile:    (p)    => ipcRenderer.invoke('dialog:saveFile', p),
  runCommand:  (cmd, cwd) => ipcRenderer.invoke('shell:run', cmd, cwd),
  minimize:    ()     => ipcRenderer.invoke('win:minimize'),
  maximize:    ()     => ipcRenderer.invoke('win:maximize'),
  close:       ()     => ipcRenderer.invoke('win:close'),
});
