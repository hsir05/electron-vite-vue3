import { app, BrowserWindow, shell, Tray, ipcMain, Menu, dialog, nativeImage } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
    ? path.join(process.env.APP_ROOT, 'public')
    : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
    app.quit()
    process.exit(0)
}

let win: BrowserWindow | null = null
let tray = null;
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
    win = new BrowserWindow({
        title: '移动客户端',
        //fullscreen: true   //全屏
        frame: true,   	//让桌面应用没有边框，这样菜单栏也会消失
        icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),//应用运行时的标题栏图标
        width: 800,         //设置窗口宽高
        height: 600,
        minWidth: 300,     // 最小宽度
        minHeight: 500,    // 最小高度
        // maxWidth: 300,    // 最大宽度
        maxHeight: 600,    // 最大高度
        webPreferences: {
            preload,
            backgroundThrottling: false,   //设置应用在后台正常运行
            nodeIntegration: true,     //设置能在页面使用nodejs的API
            contextIsolation: true,  //关闭警告信息
            //preload: path.join(__dirname, './preload.js')
        }
    })
   
    // 创建icon我这里使用的是一个png
    const icon = nativeImage.createFromPath(path.join(__dirname, '/static/health2.png'))
    // 实例化一个 托盘对象，传入的是托盘的图标
    tray = new Tray(icon)
    // 移动到托盘上的提示
    tray.setToolTip('移动桌面端')
    // 还可以设置 titlle
    tray.setTitle('electron demo')
    // 监听托盘右键事件
    tray.on('right-click', () => {
        // 右键菜单模板
        const tempate = [
            {
                label: '设置',
                click: () => {
                    console.log("设置");
                }
            },
            {
                label: '版本信息',
                click:()=>{
                    console.log("版本信息");
                }
            },
            {
                label: '退出',
                click: () => app.quit(),
            },
        ]
        //通过 Menu 创建菜单
        const menuConfig = Menu.buildFromTemplate(tempate)
        // 让我们的写的托盘右键的菜单替代原来的
        tray.popUpContextMenu(menuConfig)
    })
    //监听点击托盘的事件
    tray.on('click', () => {
        // 这里来控制窗口的显示和隐藏
        if (win.isVisible()) {
            win.hide()
        } else {
            win.show()
        }
    })

    if (VITE_DEV_SERVER_URL) { // #298
        win.loadURL(VITE_DEV_SERVER_URL)
        win.webContents.openDevTools()
    } else {
        win.loadFile(indexHtml)
    }
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', new Date().toLocaleString())
    })
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:')) shell.openExternal(url)
        return { action: 'deny' }
    })
    // win.webContents.on('will-navigate', (event, url) => { }) #344

    closeWin()
}

app.whenReady().then(createWindow)

// 监听所有的窗口都关闭了
app.on('window-all-closed', () => {
    win = null
    console.log('窗口全部都关闭了')
})


app.on('window-all-closed', () => {
    win = null
    if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
    if (win) {
        if (win.isMinimized()) win.restore()
        win.focus()
    }
})

app.on('activate', () => {
    const allWindows = BrowserWindow.getAllWindows()
    if (allWindows.length) {
        allWindows[0].focus()
    } else {
        createWindow()
    }
})

const closeWin = () => {
    win.on('close', (e) => {
        e.preventDefault()//阻止默认行为，一定要有
        dialog.showMessageBox({
            type: 'info',
            title: 'Information',
            cancelId: 2,
            defaultId: 0,
            message: '确定要关闭吗？',
            buttons: ['最小化', '最小化至托盘', '直接退出']
        }).then(result => {
            if (result.response == 0) {
                //阻止默认行为
                e.preventDefault();
                win.minimize();
            } else if (result.response == 1) {
                win.hide();
                win.setSkipTaskbar(true);
            } else if (result.response == 2) {
                win = null;
                app.exit();
            }
        }).catch(err => {
            console.log(err)
        })
    });
}



ipcMain.handle('open-win', (_, arg) => {
    const childWindow = new BrowserWindow({
        webPreferences: {
            preload,
            nodeIntegration: true,
            contextIsolation: false,
        },
    })

    if (VITE_DEV_SERVER_URL) {
        childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
    } else {
        childWindow.loadFile(indexHtml, { hash: arg })
    }
})
