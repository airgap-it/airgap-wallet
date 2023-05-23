import { ICoinProtocolAdapter, ProtocolService } from '@airgap/angular-core'
import { ICoinProtocol, MainProtocolSymbols } from '@airgap/coinlib-core'
import { TezosShieldedTezProtocol } from '@airgap/tezos'
import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Platform } from '@ionic/angular'

@Injectable({
  providedIn: 'root'
})
export class SaplingService {
  private isInitialized: boolean = false

  constructor(
    private readonly protocolService: ProtocolService,
    private readonly platform: Platform,
    private readonly httpClient: HttpClient
  ) {}

  public async initSapling() {
    if (!this.isInitialized) {
      const shieldedTezProtocol: ICoinProtocol = await this.protocolService.getProtocol(MainProtocolSymbols.XTZ_SHIELDED)
      if (!(shieldedTezProtocol instanceof ICoinProtocolAdapter)) {
        return
      }

      const shieldedTezAdapter: ICoinProtocolAdapter<TezosShieldedTezProtocol> = shieldedTezProtocol
      await shieldedTezAdapter.protocolV1.initParameters(await this.getSaplingParams('spend'), await this.getSaplingParams('output'))
      this.isInitialized = true
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
