import { ClipboardService, UIResource } from '@airgap/angular-core'
import { ICoinProtocol, TezosNetwork } from '@airgap/coinlib-core'
import { Injectable, InjectionToken } from '@angular/core'
import { Observable } from 'rxjs'

import { TezosFAFormStore } from './tezos-fa-form.store'
import { TezosFAFormState, TokenDetails, TokenDetailsInput, TokenInterface } from './tezos-fa-form.types'

export const TEZOS_FA_FORM_FACADE = new InjectionToken<TezosFAFormFacade>('TezosFAFormFacade')
export interface TezosFAFormFacade {
  readonly tokenInterface$: Observable<UIResource<TokenInterface>>
  readonly tokenID$: Observable<UIResource<number>>

  readonly tokenInterfaces$: Observable<TokenInterface[]>
  readonly tokens$: Observable<TokenDetails[]>
  readonly networks$: Observable<TezosNetwork[]>

  readonly protocol$: Observable<UIResource<ICoinProtocol>>

  readonly errorDescription$: Observable<string>

  onTokenDetailsInput(details: TokenDetailsInput): void
  getFromClipboard(): Promise<string>
}

@Injectable()
export class TezosFAFormNgRxFacade implements TezosFAFormFacade {
  public readonly tokenInterface$: Observable<UIResource<TokenInterface>>
  public readonly tokenID$: Observable<UIResource<number>>

  public readonly tokenInterfaces$: Observable<TokenInterface[]>
  public readonly tokens$: Observable<TokenDetails[]>
  public readonly networks$: Observable<TezosNetwork[]>

  public readonly protocol$: Observable<UIResource<ICoinProtocol>>

  public readonly errorDescription$: Observable<string>

  constructor(
    private readonly store: TezosFAFormStore, 
    private readonly clipboardService: ClipboardService
  ) {
    this.tokenInterface$ = this.store.select((state: TezosFAFormState) => state.tokenInterface)
    this.tokenID$ = this.store.select((state: TezosFAFormState) => state.tokenID)

    this.tokenInterfaces$ = this.store.select((state: TezosFAFormState) => state.tokenInterfaces)
    this.tokens$ = this.store.select((state: TezosFAFormState) => state.tokens)
    this.networks$ = this.store.select((state: TezosFAFormState) => state.networks)

    this.protocol$ = this.store.select((state: TezosFAFormState) => state.protocol)
    this.errorDescription$ = this.store.select((state: TezosFAFormState) => state.errorDescription)
  }

  public onTokenDetailsInput(details: TokenDetailsInput): void {
    this.store.onTokenDetailsInput(details)
  }
  

  public async getFromClipboard(): Promise<string | undefined> {
    try {
      return this.clipboardService.paste()
    } catch (error) {
      console.error('Error: ' + error)
      return undefined
    }
  }
}