import { Injectable } from '@angular/core'
import { ChildProcess } from 'child_process'
import { Deferred } from 'src/app/helpers/promise'

const { ipcRenderer } = window.require('electron')

enum ElectronProcessMessage {
  SPAWN = 'spawn-process',
  SPAWN_REPLY = 'spawn-process-reply'
}

@Injectable({
  providedIn: 'root'
})
export class ElectronProcessService {
  private processes: Map<string, ChildProcess> = new Map()
  private messageDeferred: Map<string, Deferred<any>> = new Map()

  constructor() {
    this.initMessageListeners()
  }

  public async spawnProcess(name: string, path: string): Promise<ChildProcess> {
    let process = this.processes.get(name)
    if (!process) {
      const deferred = this.getSpawnProcessDeferred(name, path)
      return deferred.promise
    } else {
      return process
    }
  }

  private initMessageListeners() {
    ipcRenderer.on(ElectronProcessMessage.SPAWN_REPLY, (_event, deferredId, name, process) =>
      this.onProcessSpawned(deferredId, name, process)
    )
  }

  private getSpawnProcessDeferred(name: string, path: string): Deferred<ChildProcess> {
    const deferredId = `${ElectronProcessMessage.SPAWN}_${name}`

    let deferred = this.messageDeferred.get(deferredId)
    if (!deferred) {
      deferred = new Deferred()
      this.messageDeferred.set(deferredId, deferred)
      ipcRenderer.send(ElectronProcessMessage.SPAWN, deferredId, name, path)
    }
    return deferred
  }

  private onProcessSpawned(deferredId: string, name: string, process: ChildProcess) {
    this.processes.set(name, process)

    const deferred = this.messageDeferred.get(deferredId)
    if (deferred) {
      deferred.resolve(process)
    }
  }
}
