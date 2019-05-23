import { Injectable } from '@angular/core'
import { Storage } from '@ionic/storage'

export enum DataServiceKey {
  WALLET = 'wallet',
  PROTOCOL = 'protocol',
  DETAIL = 'detail',
  INTERACTION = 'interaction',
  EXCHANGE = 'exchange',
  TRANSACTION = 'transaction',
  SCAN = 'scan'
}

/*
interface ExposedPromise<T> {
  promise: Promise<T>
  resolve(value?: T | PromiseLike<T>): void
  reject(reason?: unknown): void
}

function exposedPromise<T>(): ExposedPromise<T> {
  let resolve: (value?: T | PromiseLike<T>) => void
  let reject: (reason?: unknown) => void

  // tslint:disable-next-line:promise-must-complete
  const promise: Promise<T> = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}
*/

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly data = []
  // private readonly communicationChannels: Map<string, Promise<any>> = new Map<string, Promise<any>>()

  constructor(private readonly storage: Storage) {}

  public setData(id, data) {
    this.data[id] = data
  }

  public getData(id) {
    return this.data[id]
  }

  public async get<K extends DataServiceKey>(key: K): Promise<any> {
    return this.storage.get(key)
  }

  public async set<K extends DataServiceKey>(key: K, value: any): Promise<any> {
    return this.storage.set(key, value)
  }

  /*
  public openChildCommunicationChannelId(): string {
    const id = Math.random()
      .toString(36)
      .substring(2, 15)

    this.communicationChannels.set(id, Promise.resolve())

    return id
  }
  */
}
