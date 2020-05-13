import { Injectable } from '@angular/core'
import { Deferred } from 'src/app/helpers/promise'

const { ipcRenderer } = window.require('electron')

enum ElectronProcessMessage {
  SPAWN = 'spawn-process',
  SPAWN_REPLY = 'spawn-process-reply',

  SEND = 'send-to-child',
  SEND_REPLY = 'send-to-child-reply'
}

export interface ElectronProcess {
  name: string
  path: string
}

@Injectable({
  providedIn: 'root'
})
export class ElectronProcessService {
  private processes: Map<string, number> = new Map()
  private ipcDeferred: Map<string, Deferred<any>> = new Map()

  constructor() {
    this.initMessageListeners()
  }

  public async sendToProcess<T>(process: ElectronProcess, requestId: string, data: any): Promise<T> {
    let childPid = this.processes.get(process.name)
    if (!childPid) {
      const spawnProcessDeferred = this.getSpawnProcessDeferred(process)

      childPid = await spawnProcessDeferred.promise
    }

    const messageDeferredId = `${requestId}_${new Date().getTime().toString()}`
    const messageDeferred = new Deferred<T>()
    this.ipcDeferred.set(messageDeferredId, messageDeferred)

    ipcRenderer.send(ElectronProcessMessage.SEND, messageDeferredId, childPid, data)

    return messageDeferred.promise
  }

  private initMessageListeners() {
    ipcRenderer.on(ElectronProcessMessage.SPAWN_REPLY, (_event, deferredId, name, pid) => {
      this.processes.set(name, pid)
      this.resolveDeferred(deferredId, pid)
    })
    ipcRenderer.on(ElectronProcessMessage.SEND_REPLY, (_event, deferredId, data) => {
      this.resolveDeferred(deferredId, data)
    })
  }

  private getSpawnProcessDeferred(process: ElectronProcess): Deferred<number> {
    const deferredId = `${ElectronProcessMessage.SPAWN}_${process.name}`

    let deferred = this.ipcDeferred.get(deferredId)
    if (!deferred) {
      deferred = new Deferred()
      this.ipcDeferred.set(deferredId, deferred)
      ipcRenderer.send(ElectronProcessMessage.SPAWN, deferredId, process.name, process.path)
    }
    return deferred
  }

  private resolveDeferred(deferredId: string, result: any) {
    console.log('got result', deferredId, result)
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
