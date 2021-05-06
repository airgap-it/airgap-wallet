import { Deferred } from './Deferred'

let ipcRenderer

function initElectronDeps(electron) {
  ipcRenderer = electron.ipcRenderer
}

enum ElectronProcessMessage {
  SPAWN = 'spawn-process',
  SPAWN_REPLY = 'spawn-process-reply',

  SEND = 'send-to-child',
  SEND_REPLY = 'send-to-child-reply'
}

export class ElectronProcess {
  private pid: number | null = null
  private ipcDeferred: Map<string, Deferred<any>> = new Map()

  constructor(private readonly name: string) {
    if (window.require) {
      const electron = window.require('electron')
      initElectronDeps(electron)

      this.initMessageListeners()
    } else {
      throw new Error('ElectronProcess can be used only within Electron.')
    }
  }

  public async send<T>(requestId: string, messageType: string, data?: any): Promise<T> {
    if (!this.pid) {
      const spawnDeferred = this.getSpawnDeferred()

      this.pid = await spawnDeferred.promise
    }

    const sendDeferredId = `${requestId}_${new Date().getTime().toString()}`
    const sendDeferred = new Deferred<T>()
    this.ipcDeferred.set(sendDeferredId, sendDeferred)

    ipcRenderer.send(ElectronProcessMessage.SEND, sendDeferredId, this.name, messageType, data)

    return sendDeferred.promise
  }

  private initMessageListeners() {
    ipcRenderer.on(ElectronProcessMessage.SPAWN_REPLY, (_event, deferredId, pid) => {
      this.pid = pid
      this.resolveDeferred(deferredId, pid)
    })
    ipcRenderer.on(ElectronProcessMessage.SEND_REPLY, (_event, deferredId, data) => {
      this.resolveDeferred(deferredId, data)
    })
  }

  private getSpawnDeferred(): Deferred<number> {
    const deferredId = `${ElectronProcessMessage.SPAWN}`

    let deferred = this.ipcDeferred.get(deferredId)
    if (!deferred) {
      deferred = new Deferred()
      this.ipcDeferred.set(deferredId, deferred)
      ipcRenderer.send(ElectronProcessMessage.SPAWN, deferredId, this.name)
    }
    return deferred
  }

  private resolveDeferred(deferredId: string, result: any) {
    const deferred = this.ipcDeferred.get(deferredId)
    if (!deferred) {
      return
    }

    if (result.error) {
      const error = result.error.message ? new Error(result.error.message) : result.error
      deferred.reject(error)
    } else {
      deferred.resolve(result)
    }
    this.ipcDeferred.delete(deferredId)
  }
}
