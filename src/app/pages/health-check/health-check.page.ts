import { MainProtocolSymbols, ProtocolSymbols } from '@airgap/coinlib-core'
import { Component } from '@angular/core'
import { LoadingController } from '@ionic/angular'
import { TranslateService } from '@ngx-translate/core'
import { ApiHealth, CoinlibService } from 'src/app/services/coinlib/coinlib.service'

enum CheckStatus {
  LOADING = 'loading',
  PENDING = 'pending',
  SUCCESS = 'success',
  FAIL = 'fail'
}

enum ApiType {
  NODE = 'node',
  Explorer = 'explorer'
}

interface CheckItem {
  title: string
  status: CheckStatus
  delay: number
  check: () => Promise<boolean>
}

// TODO: Should be provided by the API
const rskHealthMock = {
  identifier: MainProtocolSymbols.RBTC,
  node: { isHealthy: true },
  explorer: { isHealthy: true }
}

@Component({
  selector: 'app-health-check',
  templateUrl: './health-check.page.html',
  styleUrls: ['./health-check.page.scss']
})
export class HealthCheckPage {
  items: CheckItem[]
  private loadingElement: HTMLIonLoadingElement

  public apiHealth: ApiHealth[]

  constructor(
    private readonly coinlibService: CoinlibService,
    private readonly loadingController: LoadingController,
    private readonly translateService: TranslateService
  ) {
    this.items = [
      this.generateCheckItem('Tezos', MainProtocolSymbols.XTZ, ApiType.NODE),
      this.generateCheckItem('Tezos', MainProtocolSymbols.XTZ, ApiType.Explorer),
      this.generateCheckItem('Bitcoin', MainProtocolSymbols.BTC, ApiType.NODE),
      this.generateCheckItem('Ethereum', MainProtocolSymbols.ETH, ApiType.NODE),
      this.generateCheckItem('Ethereum', MainProtocolSymbols.ETH, ApiType.Explorer),
      this.generateCheckItem('RSK', MainProtocolSymbols.RBTC, ApiType.NODE),
      this.generateCheckItem('RSK', MainProtocolSymbols.RBTC, ApiType.Explorer),
      this.generateCheckItem('Polkadot', MainProtocolSymbols.POLKADOT, ApiType.NODE),
      this.generateCheckItem('Polkadot', MainProtocolSymbols.POLKADOT, ApiType.Explorer),
      this.generateCheckItem('Kusama', MainProtocolSymbols.KUSAMA, ApiType.NODE),
      this.generateCheckItem('Kusama', MainProtocolSymbols.KUSAMA, ApiType.Explorer),
      this.generateCheckItem('Cosmos', MainProtocolSymbols.COSMOS, ApiType.NODE),
      this.generateCheckItem('Aeternity', MainProtocolSymbols.AE, ApiType.NODE),
      this.generateCheckItem('Groestlcoin', MainProtocolSymbols.GRS, ApiType.NODE)
    ]
  }

  public async ionViewWillEnter() {
    this.displayLoading()
    this.coinlibService.checkApiHealth().then((apiHealth) => {
      this.apiHealth = apiHealth.concat(rskHealthMock) // TODO: Api result instead of mock
      this.loadingElement?.dismiss()
      this.runChecks()
    })
  }

  public async displayLoading(): Promise<void> {
    this.loadingElement = await this.loadingController.create({
      message: this.translateService.instant('health-check.message'),
      backdropDismiss: true
    })
    await this.loadingElement.present()
  }

  private generateCheckItem(protocolName: string, identifier: ProtocolSymbols, apiType: ApiType) {
    return {
      title: apiType === ApiType.NODE ? `${protocolName} Node` : `${protocolName} Explorer`,
      status: CheckStatus.LOADING,
      delay: 100,
      check: async () => {
        return this.isHealthy(identifier, apiType)
      }
    }
  }

  private async isHealthy(identifier: ProtocolSymbols, apiType: ApiType) {
    const healthInfo = this.apiHealth.find((el) => el.identifier === identifier)
    return healthInfo[apiType].isHealthy
  }

  private async runChecks() {
    this.items.forEach((item) => (item.status = CheckStatus.LOADING))
    for (let i = 0; i < this.items.length; i++) {
      const element = this.items[i]
      element.status = CheckStatus.PENDING
      await new Promise((resolve) => setTimeout(resolve, element.delay))
      element.status = (await element.check()) ? CheckStatus.SUCCESS : CheckStatus.FAIL
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
}
