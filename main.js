const electron = require('electron');
// const jwt = require('jsonwebtoken');
// const requests = require('./app/components/axios/requests');
const db = require('./app/components/db/emails');
const fs = require('fs');
// const ipcMainHandler = ('./app/components/ipcMainHandler/ipcMainHandler');
// const app_config = require('./config/app_config.json');
const url = require('url');
const path = require('path');
const { ipcMain } = require('electron');
const ipcFile =  require('./app/components/ipcMainHandler/ipcMainHandler');

const { app, BrowserWindow, Menu/*, webContents, session */ } = electron;
let dbExists = false;
let isDBPopulated = false;
const appFolder = app.getPath("userData");

// Set Environment
process.env.NODE_ENV = 'production';

// let mainWindow;
// let aboutWindow; // Software Info window

const mainMenuTemplate = [
    {
        label: app.getName(),
        submenu: [
            {
                label: 'About',
                click() {
                    createSwAboutWindow();
                }
            },
            {
                label: 'Settings',
                click() {
                    // changeSettings();
                }
            },
            {
                label: 'Quit',
                accelerator: process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
                click: () => {
                    ipcFile.peerIDUpdate(true); // Reset Peer ID in the online DB and quit the app.
                    // app.quit();
                }
            }
        ]
    },
    {
        label: 'File',
        submenu: [
            {
                label: 'New E-mail',
                click() {
                    // newEmail();
                }
            }
        ]
    }
];

// Listen for app to be ready
app.on('ready', function () {

    // check if the app DB exists
    if (fs.existsSync(`${appFolder}/db.sqlite3`)) {
        console.log('[INFO] DB found!');
        dbExists = true;
    } else {
        console.log('[INFO] No DB found!');
    }

    if (dbExists) {
        // check if the Account table is populated
        db.getAccountDetails()
            .then(result => {
                // console.log('[INFO] Account info: ', result);
                if (result[0] == undefined) {
                    console.log('[ERROR] Corrupted DB found! Terminating the app...');
                    mainWindow.loadURL(url.format({
                        pathname: path.join(__dirname, 'app/views/error.html'),
                        protocol: 'file:',
                        slashes: true
                    }));
                }
            })
            .catch(err => console.log(err))
    }

    // Create main window
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 800,
        minHeight: 600,
        maxWidth: 1920,
        maxHeight: 1080,
        useContentSize: true,
        // titleBarStyle: 'hidden',
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });

    mainWindow.maximize();
    createP2PConnectionWindow();
    if (!dbExists) {
        // Load html file into the main window using file://<dirname>/mainWindow.html
        mainWindow.loadURL(url.format({
            pathname: path.join(__dirname, 'app/views/login.html'),
            protocol: 'file:',
            slashes: true
        }));
    } else {
        mainWindow.loadURL(url.format({
            pathname: path.join(__dirname, 'app/views/login2.html'),
            protocol: 'file:',
            slashes: true
        }));
    }

    // Close all windows when quit app
    mainWindow.on('closed', function () {
        console.log('[INFO] Quitting app.');
        app.quit();
    });

    // Create and Insert the Menu
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    Menu.setApplicationMenu(mainMenu);

});

// Create Software Info window
function createSwAboutWindow() {
    // Create main window
    aboutWindow = new BrowserWindow({
        parent: mainWindow,
        modal: true,
        frame: false,
        width: 250,
        height: 300,
        resizable: false,
        // minimizable: false,
        // movable:false,
        useContentSize: true,
        webPreferences: {
            preload: path.join(__dirname, 'app/assets/js/preload.js')
        }
    });

    // Load html file into window
    aboutWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'app/views/about.html'),
        protocol: 'file:',
        slashes: true
    }));

    //Garbage Collection
    aboutWindow.on('close', function () {
        aboutWindow = null;
    });

}

// Create P2P connection hidden window
function createP2PConnectionWindow() {

    if (process.env.NODE_ENV !== 'production') {

        // Create main window
        p2pWindow = new BrowserWindow({
            parent: mainWindow,
            frame: true,
            width: 500,
            height: 300,
            resizable: false,
            show: true,
            // minimizable: false,
            // movable:false,
            useContentSize: true,
            webPreferences: { nodeIntegration: true, contextIsolation: false }
        });

    } else {

        // Create main window
        p2pWindow = new BrowserWindow({
            parent: mainWindow,
            frame: true,
            width: 500,
            height: 300,
            resizable: false,
            show: false,
            // minimizable: false,
            // movable:false,
            useContentSize: true,
            webPreferences: { nodeIntegration: true, contextIsolation: false }
        });

    }

    // Load html file into window
    p2pWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'app/views/p2p-connection.html'),
        protocol: 'file:',
        slashes: true
    }));

    //Garbage Collection
    p2pWindow.on('close', function () {
        p2pWindow = null;
    });

}


// Show Dev Tools
if (process.env.NODE_ENV !== 'production') {
    mainMenuTemplate.push({
        label: 'Developer Tools',
        submenu: [
            {
                label: 'Toggle DevTools',
                accelerator: process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
                click(item, focusedWindow) {
                    focusedWindow.toggleDevTools();
                }
            }, {
                role: 'reload',
            }
        ]
    });
}

// require('./app/components/ipcMainHandler/ipcMainHandler');