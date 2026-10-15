const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isNativeDesktop: true,
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  getAlwaysOnTop: () => ipcRenderer.invoke('get-always-on-top'),
  toggleCompactMode: (explicit) => ipcRenderer.invoke('toggle-compact-mode', explicit),
  getCompactMode: () => ipcRenderer.invoke('get-compact-mode'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeApp: () => ipcRenderer.invoke('close-app'),
  setWindowOpacity: (opacity) => ipcRenderer.invoke('set-window-opacity', opacity),
  readClipboardImage: () => ipcRenderer.invoke('read-clipboard-image'),
  getGlobalShortcuts: () => ipcRenderer.invoke('get-global-shortcuts'),
  toggleToolsWindow: () => ipcRenderer.invoke('toggle-tools-window'),
  getToolsVisibility: () => ipcRenderer.invoke('get-tools-visibility'),
  onCompactModeChanged: (callback) => {
    const listener = (event, isCompact) => callback(isCompact);
    ipcRenderer.on('compact-mode-changed', listener);
    return () => ipcRenderer.removeListener('compact-mode-changed', listener);
  },
  onAlwaysOnTopChanged: (callback) => {
    const listener = (event, isTop) => callback(isTop);
    ipcRenderer.on('always-on-top-changed', listener);
    return () => ipcRenderer.removeListener('always-on-top-changed', listener);
  },
});
