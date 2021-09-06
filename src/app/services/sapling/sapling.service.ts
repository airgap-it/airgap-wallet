import { ProtocolService } from '@airgap/angular-core'
import { MainProtocolSymbols, TezosShieldedTezProtocol } from '@airgap/coinlib-core'
import { Injectable } from '@angular/core'
import { Platform } from '@ionic/angular'

import { WalletStorageKey, WalletStorageService } from '../storage/storage'
import { HttpClient } from '@angular/common/http'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'

@Injectable({
  providedIn: 'root'
})
export class SaplingService {
  constructor(
    private readonly protocolService: ProtocolService,
    private readonly platform: Platform,
    private readonly httpClient: HttpClient,
    private readonly storageProvider: WalletStorageService
  ) {}

  public async initSapling() {
    const initialized = await this.storageProvider.get(WalletStorageKey.SAPLING_INITIALIZED)
    if (!initialized) {
      const shieldedTezProtocol = (await this.protocolService.getProtocol(MainProtocolSymbols.XTZ_SHIELDED)) as TezosShieldedTezProtocol
      await shieldedTezProtocol.initParameters(await this.getSaplingParams('spend'), await this.getSaplingParams('output'))
      this.storageProvider.set(WalletStorageKey.SAPLING_INITIALIZED, true).catch(handleErrorSentry(ErrorCategory.STORAGE))
    }
  }

  private async getSaplingParams(type: 'spend' | 'output'): Promise<Buffer> {
    if (this.platform.is('hybrid')) {
      // Sapling params are read and used in a native plugin, there's no need to read them in the Ionic part
      return Buffer.alloc(0)
    }

    const params: ArrayBuffer = await this.httpClient
      .get(`../../../assets/sapling/sapling-${type}.params`, { responseType: 'arraybuffer' })
      .toPromise()

    return Buffer.from(params)
  }
}
