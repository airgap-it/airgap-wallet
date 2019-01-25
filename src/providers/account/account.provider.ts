import { Injectable } from '@angular/core'
import { SettingsKey, StorageProvider } from '../storage/storage'
import { AccountProviderBase } from '../account/account.provider.base'

@Injectable()
export class AccountProvider extends AccountProviderBase {
  constructor(storageProvider: StorageProvider) {
    super(storageProvider, SettingsKey.WALLET)
  }
}
