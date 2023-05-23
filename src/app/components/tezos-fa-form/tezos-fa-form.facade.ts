import { BaseFacade, ClipboardService, UIResource } from '@airgap/angular-core'
import { BaseNgRxFacade } from '@airgap/angular-ngrx'
import { ICoinProtocol } from '@airgap/coinlib-core'
import { protocolNetworkIdentifier } from '@airgap/module-kit'
import { TezosProtocolNetwork } from '@airgap/tezos'
import { Injectable, InjectionToken } from '@angular/core'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

import { TezosFAFormStore } from './tezos-fa-form.store'
import { TezosFAFormState, TokenDetails, TokenDetailsInput, TokenInterface } from './tezos-fa-form.types'

export const TEZOS_FA_FORM_FACADE = new InjectionToken<TezosFAFormFacade>('TezosFAFormFacade')
export type TezosFAFormFacade<T extends BaseFacade = BaseFacade> = ITezosFAFormFacade & T

type EnhancedTezosProtocolNetwork = TezosProtocolNetwork & { identifier: string }

export interface ITezosFAFormFacade {
  readonly tokenInterface$: Observable<UIResource<TokenInterface>>
  readonly tokenID$: Observable<UIResource<number>>

  readonly tokenInterfaces$: Observable<TokenInterface[]>
  readonly tokens$: Observable<TokenDetails[]>
  readonly networks$: Observable<EnhancedTezosProtocolNetwork[]>

  readonly protocol$: Observable<UIResource<ICoinProtocol>>

  readonly errorDescription$: Observable<string>

  onTokenDetailsInput(details: TokenDetailsInput): void
  getFromClipboard(): Promise<string>
}

@Injectable()
export class TezosFAFormNgRxFacade extends BaseNgRxFacade<TezosFAFormStore> implements ITezosFAFormFacade {
  public readonly tokenInterface$: Observable<UIResource<TokenInterface>>
  public readonly tokenID$: Observable<UIResource<number>>

  public readonly tokenInterfaces$: Observable<TokenInterface[]>
  public readonly tokens$: Observable<TokenDetails[]>
  public readonly networks$: Observable<EnhancedTezosProtocolNetwork[]>

  public readonly protocol$: Observable<UIResource<ICoinProtocol>>

  public readonly errorDescription$: Observable<string>

  constructor(store: TezosFAFormStore, private readonly clipboardService: ClipboardService) {
    super(store)
    this.tokenInterface$ = this.store.select((state: TezosFAFormState) => state.tokenInterface)
    this.tokenID$ = this.store.select((state: TezosFAFormState) => state.tokenId)

    this.tokenInterfaces$ = this.store.select((state: TezosFAFormState) => state.tokenInterfaces)
    this.tokens$ = this.store.select((state: TezosFAFormState) => state.tokens)
    this.networks$ = this.store
      .select((state: TezosFAFormState) => state.networks)
      .pipe(
        map((networks: TezosProtocolNetwork[]) =>
          networks.map((network: TezosProtocolNetwork) => ({
            ...network,
            identifier: protocolNetworkIdentifier(network)
          }))
        )
      )

    this.protocol$ = this.store.select((state: TezosFAFormState) => state.protocol)
    this.errorDescription$ = this.store.select((state: TezosFAFormState) => state.errorDescription)
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
      // tslint:disable-next-line: no-console
      console.error(`Error: ${error}`)

      return undefined
    }
  }
}
