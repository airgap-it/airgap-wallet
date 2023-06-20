import { BaseFacade, ClipboardService, UIResource } from '@airgap/angular-core'
import { BaseNgRxFacade } from '@airgap/angular-ngrx'
import { ICoinProtocol } from '@airgap/coinlib-core'
import { protocolNetworkIdentifier } from '@airgap/module-kit'
import { OptimismProtocolNetwork } from '@airgap/optimism'
import { Injectable, InjectionToken } from '@angular/core'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

import { OptimismERC20FormStore } from './optimism-erc20-form.store'
import { OptimismERC20FormState, TokenDetailsInput } from './optimism-erc20-form.types'

export const OPTIMISM_ERC20_FORM_FACADE = new InjectionToken<OptimismERC20FormFacade>('OptimismERC20FormFacade')
export type OptimismERC20FormFacade<T extends BaseFacade = BaseFacade> = IOptimismERC20FormFacade & T

type EnhancedOptimismProtocolNetwork = OptimismProtocolNetwork & { identifier: string }

export interface IOptimismERC20FormFacade {
  readonly networks$: Observable<EnhancedOptimismProtocolNetwork[]>
  readonly protocol$: Observable<UIResource<ICoinProtocol>>

  readonly errorDescription$: Observable<string>

  onTokenDetailsInput(details: TokenDetailsInput): void
  getFromClipboard(): Promise<string>
}

@Injectable()
export class OptimismERC20FormNgRxFacade extends BaseNgRxFacade<OptimismERC20FormStore> implements IOptimismERC20FormFacade {
  public readonly networks$: Observable<EnhancedOptimismProtocolNetwork[]>
  public readonly protocol$: Observable<UIResource<ICoinProtocol>>

  public readonly errorDescription$: Observable<string>

  public constructor(store: OptimismERC20FormStore, private readonly clipboardService: ClipboardService) {
    super(store)
    this.networks$ = this.store
      .select((state: OptimismERC20FormState) => state.networks)
      .pipe(
        map((networks: OptimismProtocolNetwork[]) =>
          networks.map((network: OptimismProtocolNetwork) => ({
            ...network,
            identifier: protocolNetworkIdentifier(network)
          }))
        )
      )
    this.protocol$ = this.store.select((state: OptimismERC20FormState) => state.protocol)
    this.errorDescription$ = this.store.select((state: OptimismERC20FormState) => state.errorDescription)
  }

  public onViewInit(): never {
    this.store.onInit$()

    return super.onViewInit()
  }

  public onTokenDetailsInput(details: TokenDetailsInput): void {
    this.store.onTokenDetailsInput$(details)
  }

  public async getFromClipboard(): Promise<string | undefined> {
    try {
      return this.clipboardService.paste()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error: ${error}`)

      return undefined
    }
  }
}
