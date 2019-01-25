import { Injectable } from '@angular/core'
import { SettingsKey, StorageProvider } from '../storage/storage'
import { AccountProviderBase } from './account.provider.base'

@Injectable()
export class SubAccountProvider extends AccountProviderBase {
  constructor(storageProvider: StorageProvider) {
    super(storageProvider, SettingsKey.SUB_WALLET)
  }
}
