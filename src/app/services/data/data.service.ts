import { Injectable } from '@angular/core'
import { Storage } from '@ionic/storage'
import { BehaviorSubject, Observable } from 'rxjs'
import { AccountSync } from 'src/app/types/AccountSync'

export enum DataServiceKey {
  ACCOUNTS = 'accounts',
  PROTOCOL = 'protocol',
  DETAIL = 'detail',
  INTERACTION = 'interaction',
  EXCHANGE = 'exchange',
  TRANSACTION = 'transaction',
  SCAN = 'scan'
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly data = []
  private accountSyncs$: BehaviorSubject<AccountSync[] | null> = new BehaviorSubject(null)

  constructor(private readonly storage: Storage) {}

  public getAccountSyncs(): Observable<AccountSync[] | null> {
    return this.accountSyncs$.asObservable()
  }

  public setData(id, data) {
    if (id === DataServiceKey.ACCOUNTS) {
      this.accountSyncs$.next(data)
    }
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
}
