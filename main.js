const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow;
let tray = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "Diary",
        icon: path.join(__dirname, 'assets/icons/app-icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // HTMLファイルをロードし、完了後に開発者ツールを開く
    mainWindow.loadFile('index.html').then(() => {
        // mainWindow.webContents.openDevTools();
    });

    // ウィンドウが閉じられた時に実行
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

function createTray() {
    // タスクトレイアイコンのセットアップ
    tray = new Tray(path.join(__dirname, 'assets/icons/tray-icon.png'));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Open', click: () => {
                mainWindow.show();
            }
        },
        {
            label: 'Quit', click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);
    tray.setToolTip('Diary App');
    tray.setContextMenu(contextMenu);

    // タスクトレイアイコンをクリックしたときにウィンドウを表示/非表示
    tray.on('click', () => {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
}

app.whenReady().then(() => {
    createWindow();
    createTray();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    } else {
        mainWindow.show();
    }
});
