// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron')
const { fork } = require('child_process')
const { join } = require('path')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 920,
    width: 1600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('www/index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    for (const [_, child] of childProcesses) {
      child.kill()
    }

    app.quit()
  }
})

app.on('activate', function() {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

const processPaths = new Map([['ledger', join(__dirname, 'ledger-transport.js')]])

const childProcesses = new Map()
const callbacks = new Map()

ipcMain.on('spawn-process', function(event, requestId, name) {
  const child = childProcesses.get(name)
  const reply = child ? child.pid : spawnProcess(name)

  event.reply('spawn-process-reply', requestId, reply)
})

ipcMain.on('send-to-child', function(event, requestId, name, type, data) {
  const child = childProcesses.get(name)
  if (!child) {
    event.reply('send-to-child-reply', requestId, { error: 'Process is not running.' })
  } else {
    callbacks.set(requestId, message => {
      event.reply('send-to-child-reply', message.requestId, message.data)
    })

    child.send({
      requestId,
      type,
      data
    })
  }
})

function spawnProcess(name) {
  const params = []
  const options = {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc']
  }

  const path = processPaths.get(name)

  if (path) {
    const child = fork(path, params, options)
    child.on('message', message => {
      const callback = callbacks.get(message.requestId)

      if (callback) {
        callback(message)
        callbacks.delete(message.requestId)
      }
    })

    childProcesses.set(name, child)

    return child.pid
  } else {
    return { error: 'Unknown process name.' }
  }
}
