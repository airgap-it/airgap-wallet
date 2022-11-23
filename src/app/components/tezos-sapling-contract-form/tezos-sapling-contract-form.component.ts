import { BaseComponent, UIResourceStatus } from '@airgap/angular-core'
import { MainProtocolSymbols } from '@airgap/coinlib-core'
import { Component, EventEmitter, Inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core'
import { FormBuilder, FormGroup, Validators } from '@angular/forms'
import { combineLatest } from 'rxjs'
import { debounceTime, takeUntil } from 'rxjs/operators'

import {
  TezosSaplingContractFormFacade,
  TezosSaplingContractFormNgRxFacade,
  TEZOS_SAPLING_CONTRACT_FORM_FACADE
} from './tezos-sapling-contract-form.facade'
import { TezosSaplingContractFormStore } from './tezos-sapling-contract-form.store'

@Component({
  selector: 'tezos-sapling-contract-form',
  templateUrl: 'tezos-sapling-contract-form.component.html',
  styleUrls: ['tezos-sapling-contract-form.component.scss'],
  providers: [{ provide: TEZOS_SAPLING_CONTRACT_FORM_FACADE, useClass: TezosSaplingContractFormNgRxFacade }, TezosSaplingContractFormStore]
})
export class TezosSaplingContractForm extends BaseComponent<TezosSaplingContractFormFacade> implements OnChanges {
  public readonly UIResourceStatus: typeof UIResourceStatus = UIResourceStatus

  @Input()
  public protocolIdentifier: MainProtocolSymbols

  @Input()
  public networkIdentifier: string

  @Output()
  public readonly contractAddress: EventEmitter<{ address: string; configuration?: any } | undefined> = new EventEmitter()

  public readonly formGroup: FormGroup

  constructor(
    @Inject(TEZOS_SAPLING_CONTRACT_FORM_FACADE) facade: TezosSaplingContractFormFacade,
    private readonly formBuilder: FormBuilder
  ) {
    super(facade)
    this.formGroup = this.formBuilder.group({
      address: ['', Validators.compose([Validators.required, Validators.pattern(/^KT1[1-9A-Za-z]{33}$/)])],
      injector: false,
      injectorUrl: ['', Validators.pattern(/^http[s]?:\/\/.+/)]
    })

    this.setListeners()
  }

  public ngOnInit(): never {
    this.facade.onViewChangedWithParameters({
      protocolIdentifier: this.protocolIdentifier,
      networkIdentifier: this.networkIdentifier
    })

    return super.ngOnInit()
  }

  public ngOnChanges(changes: SimpleChanges): void {
    this.facade.onViewChangedWithParameters({
      protocolIdentifier: changes.protocolIdentifier.currentValue,
      networkIdentifier: changes.networkIdentifier.currentValue
    })
  }

  private setListeners(): void {
    this.formGroup.controls['address'].valueChanges.pipe(debounceTime(500), takeUntil(this.ngDestroyed$)).subscribe((value) => {
      this.facade.onContractAddressInput(value)
    })

    this.formGroup.controls['injector'].valueChanges.pipe(takeUntil(this.ngDestroyed$)).subscribe((value) => {
      this.facade.onIncludeInjectorToggled(value)
    })

    this.formGroup.controls['injectorUrl'].valueChanges.pipe(debounceTime(500), takeUntil(this.ngDestroyed$)).subscribe((value) => {
      this.facade.onInjectorUrlInput(value)
    })

    combineLatest([this.facade.newContractAddress$, this.facade.includeInjector$, this.facade.newInjectorUrl$])
      .pipe(takeUntil(this.ngDestroyed$))
      .subscribe(([contractAddress, includeInjector, injectorUrl]) => {
        const contractAddressValid = contractAddress.status === UIResourceStatus.SUCCESS
        const injectorUrlValid = !includeInjector || (injectorUrl.status === UIResourceStatus.SUCCESS && injectorUrl.value !== undefined)

        if (contractAddressValid && injectorUrlValid) {
          this.contractAddress.emit({
            address: contractAddress.value,
            configuration: { injectorUrl: includeInjector ? injectorUrl.value : undefined }
          })
        } else {
          this.contractAddress.emit(undefined)
        }
      })
  }

  public async pasteFromClipboard(control: 'address' | 'injectorUrl'): Promise<void> {
    const text: string | undefined = await this.facade.getFromClipboard()
    if (text !== undefined) {
      this.formGroup.patchValue({ [control]: text })
    }
  }

  public async openInjectorLink(): Promise<void> {
    await this.facade.openUrl('https://github.com/airgap-it/sapling-injector')  
  }

  public async openSaplingLink(): Promise<void> {
    await this.facade.openUrl('https://gitlab.com/tezos/tezos/-/blob/master/src/proto_alpha/lib_protocol/test/integration/michelson/contracts/sapling_contract.tz')
  }
}
