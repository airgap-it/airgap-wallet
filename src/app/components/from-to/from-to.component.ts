import { Component, Input, Output, EventEmitter } from '@angular/core'
import { IAirGapTransaction, MainProtocolSymbols, TezosWrappedOperation } from '@airgap/coinlib-core'
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms'
import { FeeConverterPipe, ProtocolService } from '@airgap/angular-core'

@Component({
  selector: 'beacon-from-to',
  templateUrl: './from-to.component.html',
  styleUrls: ['./from-to.component.scss']
})
export class FromToComponent {
  public formGroup: FormGroup | undefined

  @Input()
  public transactions: IAirGapTransaction[] | undefined

  @Input()
  public wrappedOperation: TezosWrappedOperation | undefined

  @Output()
  public readonly onWrappedOperationUpdate: EventEmitter<TezosWrappedOperation> = new EventEmitter<TezosWrappedOperation>()

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly protocolService: ProtocolService,
    private readonly feeConverterPipe: FeeConverterPipe
  ) {}

  public advanced: boolean = false

  public get operationControls(): FormArray | undefined {
    if (this.formGroup === undefined) {
      return undefined
    }
    return this.formGroup.controls.operations as FormArray
  }

  public async initForms() {
    if (this.wrappedOperation === undefined) {
      return
    }

    const protocol = await this.protocolService.getProtocol(MainProtocolSymbols.XTZ)

    const formGroups = await Promise.all(
      this.wrappedOperation.contents.map(async (operation: any) => {
        const feeValue = await this.feeConverterPipe.transform(operation.fee, { protocol, dropSymbol: true })
        const feeControl = this.formBuilder.control(feeValue, [
          Validators.required,
          Validators.pattern(`^[0-9]+(\.[0-9]{1,${protocol.feeDecimals}})*$`)
        ])
        const gasLimitControl = this.formBuilder.control(operation.gas_limit, [Validators.required, Validators.min(0)])
        const storageLimitControl = this.formBuilder.control(operation.storage_limit, [Validators.required, Validators.min(0)])
        return this.formBuilder.group({
          fee: feeControl,
          gasLimit: gasLimitControl,
          storageLimit: storageLimitControl
        })
      })
    )
    this.formGroup = this.formBuilder.group({
      operations: this.formBuilder.array(formGroups)
    })
  }

  public async updateOperationGroup() {
    if (this.wrappedOperation === undefined) {
      return
    }
    const protocol = await this.protocolService.getProtocol(MainProtocolSymbols.XTZ)

    this.wrappedOperation.contents = await Promise.all(
      this.wrappedOperation.contents.map(async (operation, index) => {
        const group = (this.formGroup.controls.operations as FormArray).controls[index] as FormGroup
        const fee = await this.feeConverterPipe.transform(group.controls.fee.value, { protocol, dropSymbol: true, reverse: true })

        return {
          ...operation,
          fee,
          gas_limit: String(group.controls.gasLimit.value),
          storage_limit: String(group.controls.storageLimit.value)
        }
      })
    )
    this.onWrappedOperationUpdate.emit(this.wrappedOperation)
    this.advanced = false
  }
}
