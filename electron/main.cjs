const { app, BrowserWindow, shell, ipcMain, globalShortcut, Tray, Menu, screen, nativeImage, clipboard } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;
let toolsWindow = null;
let toolsEnabled = true;
let tray = null;
let isQuitting = false;
let isCompactMode = true;

// Window sizes tuned to the paper aspect ratio (page ~ 0.74 w/h, top bar 42px)
const COMPACT_SIZE = { width: 400, height: 572 };
const EXPANDED_SIZE = { width: 780, height: 580 };
const TOOLS_WIDTH = 480;
const TOOLS_HEIGHT = 100;

function getSavedBounds() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  // Position neatly on the right side of the screen by default
  const defaultX = Math.max(20, screenWidth - COMPACT_SIZE.width - 24);
  const defaultY = Math.max(20, Math.floor((screenHeight - COMPACT_SIZE.height) / 2));

  return {
    x: defaultX,
    y: defaultY,
    width: COMPACT_SIZE.width,
    height: COMPACT_SIZE.height,
  };
}

function createWindow() {
  const initialBounds = getSavedBounds();

  mainWindow = new BrowserWindow({
    x: initialBounds.x,
    y: initialBounds.y,
    width: initialBounds.width,
    height: initialBounds.height,
    minWidth: 340,
    minHeight: 420,
    title: 'NotBooks - Caderno Flutuante',
    frame: false, // Frameless for pure floating notebook appearance
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true, // Floats over browser, games, IDEs, videos
    hasShadow: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Keep floating level high so it stays above full-screen apps & browsers
  mainWindow.setAlwaysOnTop(true, 'floating');
  applySizeLimits(true);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // When clicking close (X), hide to tray instead of quitting
  // so the global shortcut continues working instantly at any time
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      hideAll();
      return false;
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  loadRenderer(mainWindow);
}

function loadRenderer(win, query) {
  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    win.loadURL(query ? `${devServerUrl}/?${query}` : devServerUrl);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'), query ? { search: query } : undefined);
  }
}

function createToolsWindow() {
  const main = mainWindow ? mainWindow.getBounds() : getSavedBounds();
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
  // Position tools palette neatly beside or above the notebook
  let x = main.x - TOOLS_WIDTH - 12;
  if (x < 10) x = Math.min(screenWidth - TOOLS_WIDTH - 10, main.x + main.width + 12);
  let y = Math.max(20, main.y + 40);

  toolsWindow = new BrowserWindow({
    x: Math.max(10, x),
    y: y,
    width: TOOLS_WIDTH,
    height: TOOLS_HEIGHT,
    resizable: true,
    maximizable: false,
    minimizable: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: true,
    focusable: true,
    show: false,
    title: 'NotBooks - Ferramentas',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  toolsWindow.setAlwaysOnTop(true, 'floating');

  toolsWindow.once('ready-to-show', () => {
    if (toolsEnabled && mainWindow && mainWindow.isVisible()) toolsWindow.showInactive();
  });

  toolsWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      toolsEnabled = false;
      toolsWindow.hide();
      notifyToolsVisibility();
    }
  });

  loadRenderer(toolsWindow, 'window=tools');
}

function notifyToolsVisibility() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tools-visibility-changed', toolsEnabled);
  }
}

function showAll() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  if (toolsWindow && toolsEnabled) toolsWindow.showInactive();
}

function hideAll() {
  if (mainWindow) mainWindow.hide();
  if (toolsWindow) toolsWindow.hide();
}

function toggleToolsWindow() {
  toolsEnabled = !toolsEnabled;
  if (toolsWindow) {
    if (toolsEnabled && mainWindow && mainWindow.isVisible()) toolsWindow.showInactive();
    else toolsWindow.hide();
  }
  notifyToolsVisibility();
  return toolsEnabled;
}

function toggleWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isVisible()) {
    if (mainWindow.isFocused() || (toolsWindow && toolsWindow.isFocused())) {
      hideAll();
    } else {
      showAll();
    }
  } else {
    showAll();
  }
}

function createTray() {
  try {
    const iconPath = path.join(__dirname, 'tray-icon.png');
    tray = new Tray(iconPath);
  } catch {
    // Fallback native image
    const fallbackImage = nativeImage.createEmpty();
    tray = new Tray(fallbackImage);
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'NotBooks - Caderno Flutuante',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Abrir / Ocultar (Ctrl+Alt+N)',
      click: () => toggleWindow(),
    },
    {
      label: 'Sempre no Topo (Flutuante)',
      type: 'checkbox',
      checked: true,
      click: (menuItem) => {
        if (mainWindow) {
          mainWindow.setAlwaysOnTop(menuItem.checked, 'floating');
          mainWindow.webContents.send('always-on-top-changed', menuItem.checked);
        }
      },
    },
    {
      label: 'Modo Compacto Secundário (1 Pág)',
      click: () => {
        setWindowCompactMode(true);
      },
    },
    {
      label: 'Modo Expandido (2 Págs)',
      click: () => {
        setWindowCompactMode(false);
      },
    },
    { type: 'separator' },
    {
      label: 'Sair Definitivamente',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('NotBooks: Pressione Ctrl+Alt+N para abrir/ocultar');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    toggleWindow();
  });
}

function registerGlobalShortcuts() {
  // Primary mnemonic shortcut: Ctrl+Alt+N
  try {
    globalShortcut.register('CommandOrControl+Alt+N', () => {
      toggleWindow();
    });
  } catch (err) {
    console.warn('Failed to register CommandOrControl+Alt+N:', err);
  }

  // Ergonomic one-hand alternative: Ctrl+Shift+Space
  try {
    globalShortcut.register('CommandOrControl+Shift+Space', () => {
      toggleWindow();
    });
  } catch (err) {
    console.warn('Failed to register CommandOrControl+Shift+Space:', err);
  }
}

function applySizeLimits(compact) {
  if (!mainWindow) return;
  if (compact) {
    mainWindow.setMinimumSize(340, 420);
    mainWindow.setMaximumSize(560, 780);
  } else {
    mainWindow.setMinimumSize(620, 420);
    mainWindow.setMaximumSize(1120, 760);
  }
}

function setWindowCompactMode(compact) {
  if (!mainWindow) return;
  isCompactMode = compact;
  applySizeLimits(compact);

  const currentBounds = mainWindow.getBounds();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  if (compact) {
    // Resize to compact floating companion
    const newWidth = COMPACT_SIZE.width;
    const newHeight = Math.min(COMPACT_SIZE.height, screenHeight - 60);
    // Keep X near right if already on right side
    let newX = currentBounds.x;
    if (newX + newWidth > screenWidth) {
      newX = screenWidth - newWidth - 20;
    }
    mainWindow.setBounds({
      x: newX,
      y: currentBounds.y,
      width: newWidth,
      height: newHeight,
    });
  } else {
    // Resize to expanded double page
    const newWidth = Math.min(EXPANDED_SIZE.width, screenWidth - 40);
    const newHeight = Math.min(EXPANDED_SIZE.height, screenHeight - 60);
    let newX = currentBounds.x;
    if (newX + newWidth > screenWidth) {
      newX = Math.max(20, screenWidth - newWidth - 20);
    }
    mainWindow.setBounds({
      x: newX,
      y: currentBounds.y,
      width: newWidth,
      height: newHeight,
    });
  }

  mainWindow.webContents.send('compact-mode-changed', isCompactMode);
}

// IPC Handlers
ipcMain.handle('toggle-always-on-top', () => {
  if (!mainWindow) return false;
  const isTop = !mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(isTop, 'floating');
  return isTop;
});

ipcMain.handle('get-always-on-top', () => {
  return mainWindow ? mainWindow.isAlwaysOnTop() : true;
});

ipcMain.handle('toggle-compact-mode', (event, explicitValue) => {
  const target = typeof explicitValue === 'boolean' ? explicitValue : !isCompactMode;
  setWindowCompactMode(target);
  return isCompactMode;
});

ipcMain.handle('get-compact-mode', () => {
  return isCompactMode;
});

ipcMain.handle('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('hide-window', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.handle('close-app', () => {
  isQuitting = true;
  app.quit();
});

ipcMain.handle('set-window-opacity', (event, opacity) => {
  if (mainWindow && typeof opacity === 'number') {
    const clamped = Math.max(0.4, Math.min(1.0, opacity));
    mainWindow.setOpacity(clamped);
    return clamped;
  }
  return 1.0;
});

ipcMain.handle('read-clipboard-image', () => {
  try {
    const image = clipboard.readImage();
    if (image && !image.isEmpty()) {
      return image.toDataURL();
    }
  } catch (err) {
    console.warn('Failed to read image from clipboard:', err);
  }
  return null;
});

ipcMain.handle('get-global-shortcuts', () => {
  return {
    primary: 'Ctrl + Alt + N',
    secondary: 'Ctrl + Shift + Espaço',
  };
});

ipcMain.handle('toggle-tools-window', () => {
  return toggleToolsWindow();
});

ipcMain.handle('get-tools-visibility', () => {
  return toolsEnabled;
});

app.whenReady().then(() => {
  createWindow();
  createToolsWindow();
  createTray();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      createToolsWindow();
    } else if (mainWindow) {
      showAll();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Keep app active in background tray for quick shortcut trigger
});
