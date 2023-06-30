import { BaseComponent, UIResourceStatus } from '@airgap/angular-core'
import { ICoinProtocol } from '@airgap/coinlib-core'
import { Component, EventEmitter, Inject, Output } from '@angular/core'
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms'
import { debounceTime, takeUntil } from 'rxjs/operators'

import { OptimismERC20FormFacade, OptimismERC20FormNgRxFacade, OPTIMISM_ERC20_FORM_FACADE } from './optimism-erc20-form.facade'
import { OptimismERC20FormStore } from './optimism-erc20-form.store'

@Component({
  selector: 'optimism-erc20-form',
  templateUrl: 'optimism-erc20-form.component.html',
  styleUrls: ['optimism-erc20-form.component.scss'],
  providers: [{ provide: OPTIMISM_ERC20_FORM_FACADE, useClass: OptimismERC20FormNgRxFacade }, OptimismERC20FormStore]
})
export class OptimismERC20Form extends BaseComponent<OptimismERC20FormFacade> {
  public readonly UIResourceStatus: typeof UIResourceStatus = UIResourceStatus

  @Output()
  public readonly protocol: EventEmitter<ICoinProtocol> = new EventEmitter()

  public readonly formGroup: UntypedFormGroup

  public constructor(
    @Inject(OPTIMISM_ERC20_FORM_FACADE) facade: OptimismERC20FormFacade,
    private readonly formBuilder: UntypedFormBuilder
  ) {
    super(facade)
    this.formGroup = this.formBuilder.group({
      address: ['', Validators.compose([Validators.required, Validators.pattern(/^0x[a-fA-F0-9]{40}$/)])],
      network: [null, Validators.compose([Validators.required])]
    })

    this.setListeners()
  }

  private setListeners() {
    this.formGroup.valueChanges
      .pipe(debounceTime(500), takeUntil(this.ngDestroyed$))
      .subscribe((value: { address: string; network: string }) => {
        this.facade.onTokenDetailsInput({ address: value.address, networkIdentifier: value.network })
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
