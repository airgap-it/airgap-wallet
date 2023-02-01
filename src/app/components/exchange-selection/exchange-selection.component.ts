import { AirGapMarketWallet } from '@airgap/coinlib-core'
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core'
import { FormGroup } from '@angular/forms'
import { ModalController } from '@ionic/angular'
import { UIWidget } from 'src/app/models/widgets/UIWidget'
import { ExchangeSelectPage } from 'src/app/pages/exchange-select/exchange-select.page'
import { ExchangeState } from 'src/app/pages/exchange/exchange'
import { ExchangeEnum, LiquidityExchangeEnum, SwapExchangeEnum } from 'src/app/services/exchange/exchange'
import { ErrorCategory, handleErrorSentry } from 'src/app/services/sentry-error-handler/sentry-error-handler'

@Component({
  selector: 'exchange-selection',
  templateUrl: './exchange-selection.component.html',
  styleUrls: ['./exchange-selection.component.scss']
})
export class ExchangeSelectionComponent implements OnInit {
  public ExchangeEnum: typeof SwapExchangeEnum = SwapExchangeEnum
  public LiquidityExchangeEnum: typeof LiquidityExchangeEnum = LiquidityExchangeEnum

  @Input()
  public hideExchangeSelection: boolean = false

  @Input()
  public disableExchangeSelection: boolean = false

  @Input()
  public readonly wallet: AirGapMarketWallet

  @Input()
  public activeExchange: ExchangeEnum

  @Input()
  public exchangeWidgets: UIWidget[]

  @Input()
  public state: ExchangeState

  @Input()
  public exchangeForm: FormGroup

  @Output()
  private readonly setupEmitter: EventEmitter<void> = new EventEmitter()

  constructor(private readonly modalController: ModalController) {}

  ngOnInit() {}

  async doRadio(): Promise<void> {
    const modal: HTMLIonModalElement = await this.modalController.create({
      component: ExchangeSelectPage,
      componentProps: {
        activeExchange: this.activeExchange
      }
    })

    modal.present().catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))

    modal
      .onDidDismiss()
      .then(async () => {
        this.setupEmitter.next()
      })
      .catch(handleErrorSentry(ErrorCategory.IONIC_MODAL))
  }
}
