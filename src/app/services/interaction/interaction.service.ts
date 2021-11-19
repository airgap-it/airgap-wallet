import { DeeplinkService } from '@airgap/angular-core'
import { AirGapMarketWallet, generateId, IACMessageDefinitionObjectV3, IACMessageType, IAirGapTransaction } from '@airgap/coinlib-core'
import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { AirGapMarketWalletGroup, InteractionSetting } from 'src/app/models/AirGapMarketWalletGroup'
import { DataService, DataServiceKey } from '../data/data.service'
import { OperationsProvider } from '../operations/operations'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'

@Injectable({
  providedIn: 'root'
})
export class InteractionService {
  constructor(
    private readonly dataService: DataService,
    private readonly deeplinkService: DeeplinkService,
    private readonly operationsProvider: OperationsProvider,
    private readonly router: Router
  ) { }

  public startInteraction(
    group: AirGapMarketWalletGroup,
    wallet: AirGapMarketWallet,
    interactionData: unknown,
    type: IACMessageType,
    airGapTxs?: IAirGapTransaction[],
    isRelay: boolean = false,
    generatedId?: number
  ) {
    const interactionSetting = group.interactionSetting

    switch (interactionSetting) {
      case InteractionSetting.UNDETERMINED:
        this.goToInteractionSelectionPage(group, wallet, airGapTxs, interactionData, type, isRelay, generatedId)
        break
      case InteractionSetting.ALWAYS_ASK:
        this.goToInteractionSelectionPage(group, wallet, airGapTxs, interactionData, type, isRelay, generatedId)
        break
      case InteractionSetting.SAME_DEVICE:
        this.sameDeviceSign(wallet, interactionData as IACMessageDefinitionObjectV3[], type, isRelay, generatedId)
        break
      case InteractionSetting.OFFLINE_DEVICE:
        this.offlineDeviceSign(wallet, airGapTxs, interactionData as IACMessageDefinitionObjectV3[], type, isRelay, generatedId)
        break
      case InteractionSetting.LEDGER:
        this.ledgerSign(wallet, airGapTxs, interactionData)
        break
      default:
    }
  }

  private goToInteractionSelectionPage(
    group: AirGapMarketWalletGroup,
    wallet: AirGapMarketWallet,
    airGapTxs: IAirGapTransaction[],
    interactionData: unknown,
    type: IACMessageType,
    isRelay: boolean = false,
    generatedId?: number
  ): void {
    const info = {
      group,
      wallet,
      airGapTxs,
      data: interactionData,
      type,
      isRelay,
      generatedId,
    }
    this.dataService.setData(DataServiceKey.INTERACTION, info)
    this.router.navigateByUrl('/interaction-selection/' + DataServiceKey.INTERACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  public async offlineDeviceSign(
    wallet: AirGapMarketWallet,
    airGapTxs: IAirGapTransaction[],
    interactionData: IACMessageDefinitionObjectV3[],
    type: IACMessageType,
    isRelay: boolean = false,
    generatedId?: number
  ) {
    const dataQR = await this.prepareQRData(wallet, interactionData, type, isRelay, generatedId)
    const info = {
      wallet,
      airGapTxs,
      data: dataQR,
      interactionData
    }
    this.dataService.setData(DataServiceKey.TRANSACTION, info)
    this.router.navigateByUrl('/transaction-qr/' + DataServiceKey.TRANSACTION).catch((err) => console.error(err))
  }

  public async sameDeviceSign(
    wallet: AirGapMarketWallet,
    interactionData: IACMessageDefinitionObjectV3[],
    type: IACMessageType,
    isRelay: boolean = false,
    generatedId?: number
  ) {
    const dataQR = await this.prepareQRData(wallet, interactionData, type, isRelay, generatedId)
    this.deeplinkService
      .sameDeviceDeeplink(dataQR)
      .then(() => {
        this.router.navigateByUrl('/tabs/portfolio').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
      })
      .catch(handleErrorSentry(ErrorCategory.DEEPLINK_PROVIDER))
  }

  public ledgerSign(wallet: AirGapMarketWallet, airGapTxs: IAirGapTransaction[], data: any) {
    const info = {
      wallet: wallet,
      airGapTxs: airGapTxs,
      data
    }
    this.dataService.setData(DataServiceKey.TRANSACTION, info)
    this.router.navigateByUrl('/ledger-sign/' + DataServiceKey.TRANSACTION).catch(handleErrorSentry(ErrorCategory.NAVIGATION))
  }

  private async prepareQRData(
    wallet: AirGapMarketWallet,
    interactionData: IACMessageDefinitionObjectV3[],
    type: IACMessageType,
    isRelay: boolean = false,
    generatedId?: number
  ): Promise<IACMessageDefinitionObjectV3[]> {
    if (isRelay) {
      return interactionData
    }
    generatedId = generatedId ? generatedId : generateId(8)
    return this.operationsProvider.prepareSignRequest(wallet, interactionData, type, generatedId).catch((error) => {
      console.warn(`Could not serialize transaction: ${error}`)
      // TODO: Show error (toast)

      return interactionData // Fallback
    })
  }
}
