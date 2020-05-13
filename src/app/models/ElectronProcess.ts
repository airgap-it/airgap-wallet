import { Deferred } from './Deferred'

const { ipcRenderer } = window.require('electron')

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
    this.initMessageListeners()
  }

  public async send<T>(requestId: string, data: any): Promise<T> {
    if (!this.pid) {
      const spawnDeferred = this.getSpawnDeferred()

      this.pid = await spawnDeferred.promise
    }

    const sendDeferredId = `${requestId}_${new Date().getTime().toString()}`
    const sendDeferred = new Deferred<T>()
    this.ipcDeferred.set(sendDeferredId, sendDeferred)

    ipcRenderer.send(ElectronProcessMessage.SEND, sendDeferredId, this.name, data)

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
      deferred.reject(result.error)
    } else {
      deferred.resolve(result)
    }
    this.ipcDeferred.delete(deferredId)
  }
}
