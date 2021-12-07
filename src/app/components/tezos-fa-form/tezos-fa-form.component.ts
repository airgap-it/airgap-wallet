import { BaseComponent, UIResourceStatus } from '@airgap/angular-core'
import { ICoinProtocol } from '@airgap/coinlib-core'
import { Component, EventEmitter, Inject, Output } from '@angular/core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { debounceTime, takeUntil } from 'rxjs/operators'

import { TezosFAFormFacade, TezosFAFormNgRxFacade, TEZOS_FA_FORM_FACADE } from './tezos-fa-form.facade'
import { TezosFAFormStore } from './tezos-fa-form.store'
import { TokenInterface } from './tezos-fa-form.types'

@Component({
  selector: 'tezos-fa-form',
  templateUrl: 'tezos-fa-form.component.html',
  styleUrls: ['tezos-fa-form.component.scss'],
  providers: [{ provide: TEZOS_FA_FORM_FACADE, useClass: TezosFAFormNgRxFacade }, TezosFAFormStore]
})
export class TezosFAForm extends BaseComponent<TezosFAFormFacade> {
  public readonly UIResourceStatus: typeof UIResourceStatus = UIResourceStatus

  public readonly tokenInterfaceDescription: Record<TokenInterface, string> = {
    [TokenInterface.FA1p2]: 'FA1.2 (TZIP-007)',
    [TokenInterface.FA2]: 'FA2 (TZIP-012)'
  }

  public readonly isMultiAssetTokenInterface: Record<TokenInterface, boolean> = {
    [TokenInterface.FA1p2]: false,
    [TokenInterface.FA2]: true
  }

  @Output()
  public protocol: EventEmitter<ICoinProtocol> = new EventEmitter()

  public readonly formGroup: FormGroup

  constructor(@Inject(TEZOS_FA_FORM_FACADE) facade: TezosFAFormFacade, private readonly formBuilder: FormBuilder) {
    super(facade)
    this.formGroup = this.formBuilder.group({
      address: ['', Validators.compose([Validators.required, Validators.pattern(/^KT1[1-9A-Za-z]{33}$/)])],
      network: [null, Validators.compose([Validators.required])],
      tokenInterface: [null],
      tokenID: [null]
    })

    this.setListeners()
  }

  private setListeners() {
    this.formGroup.valueChanges
      .pipe(debounceTime(500), takeUntil(this.ngDestroyed$))
      .subscribe((value: { address: string; network: string; tokenInterface: TokenInterface | null; tokenID: number | null }) => {
        this.facade.onTokenDetailsInput({
          address: value.address,
          networkIdentifier: value.network,
          tokenInterface: value.tokenInterface !== null ? value.tokenInterface : undefined,
          tokenID: value.tokenID !== null ? value.tokenID : undefined
        })
      })

    this.facade.tokenInterface$.pipe(takeUntil(this.ngDestroyed$)).subscribe((value) => {
      if (value.status === UIResourceStatus.IDLE) {
        this.formGroup.patchValue({ tokenInterface: null }, { emitEvent: false })
      }
    })

    this.facade.tokenID$.pipe(takeUntil(this.ngDestroyed$)).subscribe((value) => {
      if (value.status === UIResourceStatus.IDLE) {
        this.formGroup.patchValue({ tokenID: null }, { emitEvent: false })
      }
    })

    this.facade.protocol$.pipe(takeUntil(this.ngDestroyed$)).subscribe((value) => {
      if (value.status === UIResourceStatus.SUCCESS && value.value !== undefined) {
        this.protocol.emit(value.value)
      }
    })

    this.facade.networks$.pipe(takeUntil(this.ngDestroyed$)).subscribe((values) => {
      if (!this.formGroup.value.network || !values.includes(this.formGroup.value.network)) {
        this.formGroup.patchValue({ network: values[0]?.identifier }, { emitEvent: false })
      }
    })
  }

  public async pasteFromClipboard(): Promise<void> {
    const text: string | undefined = await this.facade.getFromClipboard()
    if (text !== undefined) {
      this.formGroup.patchValue({ address: text })
    }
  }
}
