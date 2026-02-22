const { app, BrowserWindow, screen, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const { uIOhook, UiohookKey } = require('uiohook-napi');

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const widgetWidth = 140;
  const widgetHeight = 140;
  const edgeOffset = 20;

  const mainWindow = new BrowserWindow({
    width: widgetWidth,
    height: widgetHeight,
    x: width - widgetWidth - edgeOffset,
    y: height - widgetHeight - edgeOffset,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  // Track global mouse
  setInterval(() => {
    if (!mainWindow.isDestroyed()) {
      const point = screen.getCursorScreenPoint();
      const bounds = mainWindow.getBounds();
      const screenBounds = screen.getPrimaryDisplay().workArea;
      mainWindow.webContents.send('mouse-position', { point, bounds, screenBounds });
    }
  }, 16);

  // Drag handler
  ipcMain.on('move-window', (event, { x, y }) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.setBounds({ x: Math.round(x), y: Math.round(y), width: widgetWidth, height: widgetHeight });
    }
  });

  // Audio visualizer source
  ipcMain.handle('get-desktop-source-id', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    return sources[0].id;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Global keyboard tracking
uIOhook.on('keydown', () => {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0 && !windows[0].isDestroyed()) {
    windows[0].webContents.send('global-keypress');
  }
});
uIOhook.start();
