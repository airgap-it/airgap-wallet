import { Injectable } from '@angular/core'
import { StorageProvider, SettingsKey } from '../storage/storage'
import { Subject, ReplaySubject } from 'rxjs'
import { AirGapMarketWallet } from 'airgap-coin-lib'

@Injectable()
export class ActiveAccountProvider {
  public activeAccountSubject: ReplaySubject<AirGapMarketWallet> = new ReplaySubject(1)
  public refreshPageSubject: Subject<void> = new Subject()

  private activeAccount: AirGapMarketWallet

  constructor(private storageProvider: StorageProvider) {
    this.loadActiveAccountFromStorage()
  }

  private async loadActiveAccountFromStorage() {
    let publicKey = await this.storageProvider.get(SettingsKey.SELECTED_ACCOUNT)
    this.activeAccount = publicKey
    this.persist(publicKey)
    this.publish(publicKey)
  }

  public changeActiveAccount(wallet: AirGapMarketWallet) {
    this.activeAccount = wallet
    this.persist(wallet)
    this.publish(wallet)
    this.refreshPage()
  }

  private publish(wallet: AirGapMarketWallet) {
    this.activeAccountSubject.next(wallet)
  }

  private refreshPage() {
    this.refreshPageSubject.next()
  }

  public getActiveAccount(): AirGapMarketWallet {
    return this.activeAccount
  }

  public resetActiveAccount() {
    this.activeAccount = undefined
    this.persist(this.activeAccount)
    this.refreshPage()
  }

  private async persist(wallet: AirGapMarketWallet): Promise<void> {
    return this.storageProvider.set(SettingsKey.SELECTED_ACCOUNT, wallet)
  }
}
