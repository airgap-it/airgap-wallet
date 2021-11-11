import { UIResourceStatus } from '@airgap/angular-core'
import { ICoinProtocol, TezosNetwork } from '@airgap/coinlib-core'
import { Component, EventEmitter, Inject, OnDestroy, Output } from '@angular/core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { Subject } from 'rxjs'
import { debounceTime, takeUntil } from 'rxjs/operators'
import { TezosFAFormFacade, TezosFAFormNgRxFacade, TEZOS_FA_FORM_FACADE } from './tezos-fa-form.facade'

import { TezosFAFormStore } from './tezos-fa-form.store'
import { TokenInterface } from './tezos-fa-form.types'

@Component({
  selector: 'tezos-fa-form',
  templateUrl: 'tezos-fa-form.component.html',
  styleUrls: ['tezos-fa-form.component.scss'],
  providers: [
    { provide: TEZOS_FA_FORM_FACADE, useClass: TezosFAFormNgRxFacade },
    TezosFAFormStore
  ]
})
export class TezosFAForm implements OnDestroy {
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

  private readonly ngDestroyed$: Subject<void> = new Subject()

  constructor(
    @Inject(TEZOS_FA_FORM_FACADE) public readonly facade: TezosFAFormFacade,
    private readonly formBuilder: FormBuilder
  ) {
    this.formGroup = this.formBuilder.group({
      address: ['', Validators.compose([Validators.required, Validators.pattern(/^KT1[1-9A-Za-z]{33}$/)])],
      network: [TezosNetwork.MAINNET, Validators.compose([Validators.required])],
      tokenInterface: [null],
      tokenID: [null]
    })

    this.setListeners()
  }

  public ngOnDestroy(): void {
    this.ngDestroyed$.next()
    this.ngDestroyed$.complete()
  }

  private setListeners() {
    this.formGroup
      .valueChanges
      .pipe(debounceTime(500), takeUntil(this.ngDestroyed$))
      .subscribe((value: { address: string, network: TezosNetwork, tokenInterface: TokenInterface | null, tokenID: number | null }) => {
        this.facade.onTokenDetailsInput({ 
          address: value.address, 
          network: value.network, 
          tokenInterface: value.tokenInterface !== null ? value.tokenInterface : undefined, 
          tokenID: value.tokenID !== null ? value.tokenID : undefined
        })
      })

    this.facade.tokenInterface$
      .pipe(takeUntil(this.ngDestroyed$))
      .subscribe((value) => {
        if (value.status === UIResourceStatus.IDLE) {
          this.formGroup.patchValue({ tokenInterface: null }, { emitEvent: false })
        }
      })

    this.facade.tokenID$
      .pipe(takeUntil(this.ngDestroyed$))
      .subscribe((value) => {
        if (value.status === UIResourceStatus.IDLE) {
          this.formGroup.patchValue({ tokenID: null }, { emitEvent: false })
        }
      })

    this.facade.protocol$
      .pipe(takeUntil(this.ngDestroyed$))
      .subscribe((value) => {
        if (value.status === UIResourceStatus.SUCCESS && value.value !== undefined) {
          this.protocol.emit(value.value)
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
