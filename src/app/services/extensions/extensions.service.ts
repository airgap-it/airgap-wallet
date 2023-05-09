import { AddressService, AmountConverterPipe, ICoinDelegateProtocolAdapter, ProtocolService } from '@airgap/angular-core'
import { ICoinDelegateProtocol, MainProtocolSymbols, ProtocolSymbols } from '@airgap/coinlib-core'
import { CosmosProtocol } from '@airgap/cosmos'
import { MoonbaseProtocol, MoonbeamProtocol, MoonriverProtocol } from '@airgap/moonbeam'
import { KusamaProtocol, PolkadotProtocol } from '@airgap/polkadot'
import { TezosProtocol } from '@airgap/tezos'
import { DecimalPipe } from '@angular/common'
import { Injectable } from '@angular/core'
import { FormBuilder } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'
import { CoreumDelegationExtensions } from 'src/app/extensions/delegation/CoreumDelegationExtensions'

import { CosmosDelegationExtensions } from '../../extensions/delegation/CosmosDelegationExtensions'
import { MoonbeamDelegationExtensions } from '../../extensions/delegation/MoonbeamDelegationExtensions'
import { V0ProtocolDelegationExtensions } from '../../extensions/delegation/base/V0ProtocolDelegationExtensions'
import { SubstrateDelegationExtensions } from '../../extensions/delegation/SubstrateDelegationExtensions'
import { TezosDelegationExtensions } from '../../extensions/delegation/TezosDelegationExtensions'
import { ShortenStringPipe } from '../../pipes/shorten-string/shorten-string.pipe'
import { CoinlibService } from '../coinlib/coinlib.service'
import { V1ProtocolDelegationExtensions } from 'src/app/extensions/delegation/base/V1ProtocolDelegationExtensions'
import { ICPDelegationExtensions } from 'src/app/extensions/delegation/ICPDelegationExtensions'

@Injectable({
  providedIn: 'root'
})
export class ExtensionsService {
  private extensionsLoaded: boolean = false

  private v0Extensions: [new () => ICoinDelegateProtocol, () => Promise<V0ProtocolDelegationExtensions<any>>][] = [
    [
      KusamaProtocol,
      async () =>
        SubstrateDelegationExtensions.create(
          this.formBuilder,
          this.decimalPipe,
          this.amountConverterPipe,
          this.shortenStringPipe,
          this.translateService
        )
    ],
    [
      PolkadotProtocol,
      async () =>
        SubstrateDelegationExtensions.create(
          this.formBuilder,
          this.decimalPipe,
          this.amountConverterPipe,
          this.shortenStringPipe,
          this.translateService
        )
    ],
    [
      TezosProtocol,
      async () =>
        TezosDelegationExtensions.create(
          this.coinlibService,
          this.decimalPipe,
          this.amountConverterPipe,
          this.shortenStringPipe,
          this.translateService,
          this.addressService,
          this.formBuilder
        )
    ],
    [
      CosmosProtocol,
      async () =>
        CosmosDelegationExtensions.create(
          this.coinlibService,
          this.formBuilder,
          this.decimalPipe,
          this.amountConverterPipe,
          this.shortenStringPipe,
          this.translateService
        )
    ],
    [
      MoonbaseProtocol,
      async () => MoonbeamDelegationExtensions.create(this.formBuilder, this.decimalPipe, this.amountConverterPipe, this.translateService)
    ],
    [
      MoonriverProtocol,
      async () => MoonbeamDelegationExtensions.create(this.formBuilder, this.decimalPipe, this.amountConverterPipe, this.translateService)
    ],
    [
      MoonbeamProtocol,
      async () => MoonbeamDelegationExtensions.create(this.formBuilder, this.decimalPipe, this.amountConverterPipe, this.translateService)
    ]
  ]

  private readonly v1Extensions: [ProtocolSymbols, () => Promise<V1ProtocolDelegationExtensions<any>>][] = [
    [
      MainProtocolSymbols.COREUM,
      async () =>
        CoreumDelegationExtensions.create(
          this.formBuilder,
          this.decimalPipe,
          this.amountConverterPipe,
          this.shortenStringPipe,
          this.translateService
        )
    ],
    [
      
      MainProtocolSymbols.ICP,
      async () =>
        ICPDelegationExtensions.create(
          this.formBuilder,
          this.decimalPipe,
          this.amountConverterPipe,
          this.shortenStringPipe,
          this.translateService
        )
    ]
  ]

  public constructor(
    private readonly formBuilder: FormBuilder,
    private readonly decimalPipe: DecimalPipe,
    private readonly amountConverterPipe: AmountConverterPipe,
    private readonly shortenStringPipe: ShortenStringPipe,
    private readonly translateService: TranslateService,
    private readonly coinlibService: CoinlibService,
    private readonly addressService: AddressService,
    private readonly protocolService: ProtocolService
  ) {}

  public async loadDelegationExtensions(): Promise<void> {
    if (this.extensionsLoaded) {
      return
    }

    await Promise.all([
      this.loadV0Extensions(),
      this.loadV1Extensions()
    ])

    this.extensionsLoaded = true
  }

  private async loadV0Extensions(): Promise<void> {
    await Promise.all(
      this.v0Extensions.map(async ([protocol, extensionFactory]) => await V0ProtocolDelegationExtensions.load(protocol, extensionFactory))
    )
  }

  private async loadV1Extensions(): Promise<void> {
    await Promise.all(
      this.v1Extensions.map(async ([protocolIdentifier, extensionFactory]) => {
        try {
          const networks = await this.protocolService.getNetworksForProtocol(protocolIdentifier)
          await Promise.all(
            networks.map(async (network) => {
              try {
                const protocol = await this.protocolService.getProtocol(protocolIdentifier, network)
                if (!(protocol instanceof ICoinDelegateProtocolAdapter)) {
                  return
                }

                await V1ProtocolDelegationExtensions.load(protocol, extensionFactory)
              } catch {
                return
              }
            })
          )
        } catch {
          return
        }
      })
    )
  }
}
