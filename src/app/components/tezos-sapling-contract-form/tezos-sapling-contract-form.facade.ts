import { BaseFacade, ClipboardService, UIResource } from '@airgap/angular-core'
import { BaseNgRxFacade } from '@airgap/angular-ngrx'
import { ICoinProtocol } from '@airgap/coinlib-core'
import { Injectable, InjectionToken } from '@angular/core'
import { Observable } from 'rxjs'
import { BrowserService } from 'src/app/services/browser/browser.service'

import { TezosSaplingContractFormStore } from './tezos-sapling-contract-form.store'
import { TezosSaplingContractFormState, TezosSaplingContractParameters } from './tezos-sapling-contract-form.types'

export const TEZOS_SAPLING_CONTRACT_FORM_FACADE = new InjectionToken<TezosSaplingContractFormFacade>('TezosSaplingContractFormFacade')
export type TezosSaplingContractFormFacade<T extends BaseFacade = BaseFacade> = ITezosSaplingContractFormFacade & T
export interface ITezosSaplingContractFormFacade {
  readonly protocol$: Observable<UIResource<ICoinProtocol>>

  readonly currentContractAddress$: Observable<UIResource<string | undefined>>
  readonly newContractAddress$: Observable<UIResource<string>>

  readonly includeInjector$: Observable<boolean>
  readonly currentInjectorUrl$: Observable<UIResource<string | undefined>>
  readonly newInjectorUrl$: Observable<UIResource<string>>

  readonly warningDescription$: Observable<string>
  readonly errorDescription$: Observable<string>

  onViewChangedWithParameters(parameters: TezosSaplingContractParameters): void

  onContractAddressInput(address: string): void
  onIncludeInjectorToggled(includeInjector: boolean): void
  onInjectorUrlInput(url: string): void

  getFromClipboard(): Promise<string>

  openUrl(url: string): Promise<void>
}

@Injectable()
export class TezosSaplingContractFormNgRxFacade extends BaseNgRxFacade<TezosSaplingContractFormStore>
  implements ITezosSaplingContractFormFacade {
  public readonly protocol$: Observable<UIResource<ICoinProtocol>>

  public readonly currentContractAddress$: Observable<UIResource<string | undefined>>
  public readonly newContractAddress$: Observable<UIResource<string>>

  public readonly includeInjector$: Observable<boolean>
  public readonly currentInjectorUrl$: Observable<UIResource<string | undefined>>
  public readonly newInjectorUrl$: Observable<UIResource<string>>

  public readonly warningDescription$: Observable<string>
  public readonly errorDescription$: Observable<string>

  constructor(
    store: TezosSaplingContractFormStore, 
    private readonly clipboardService: ClipboardService,
    private readonly browserService: BrowserService
  ) {
    super(store)

    this.protocol$ = this.store.select((state: TezosSaplingContractFormState) => state.protocol)

    this.currentContractAddress$ = this.store.select((state: TezosSaplingContractFormState) => state.currentContractAddress)
    this.newContractAddress$ = this.store.select((state: TezosSaplingContractFormState) => state.newContractAddress)

    this.includeInjector$ = this.store.select((state: TezosSaplingContractFormState) => state.includeInjector)
    this.currentInjectorUrl$ = this.store.select((state: TezosSaplingContractFormState) => state.currentInjectorUrl)
    this.newInjectorUrl$ = this.store.select((state: TezosSaplingContractFormState) => state.newInjectorUrl)

    this.warningDescription$ = this.store.select((state: TezosSaplingContractFormState) => state.warningDescription)
    this.errorDescription$ = this.store.select((state: TezosSaplingContractFormState) => state.errorDescription)
  }

  public onViewChangedWithParameters(parameters: TezosSaplingContractParameters): void {
    this.store.onChange$(parameters)
  }

  public onContractAddressInput(address: string): void {
    this.store.onContractAddressInput$(address)
  }

  public onIncludeInjectorToggled(includeInjector: boolean): void {
    this.store.onIncludeInjectorToggled$(includeInjector)
  }

  public onInjectorUrlInput(url: string): void {
    this.store.onInjectorUrlInput$(url)
  }

  public async getFromClipboard(): Promise<string> {
    try {
      return this.clipboardService.paste()
    } catch (error) {
      // tslint:disable-next-line: no-console
      console.error(`Error: ${error}`)

      return undefined
    }
  }

  public async openUrl(url: string): Promise<void> {
    this.browserService.openUrl(url)
  }
}
