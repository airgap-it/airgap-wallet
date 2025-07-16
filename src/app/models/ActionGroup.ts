import { ICoinProtocolAdapter } from '@airgap/angular-core'
import { AirGapCoinWallet, AirGapMarketWallet, ICoinProtocol, MainProtocolSymbols, SubProtocolSymbols } from '@airgap/coinlib-core'
import { Action } from '@airgap/coinlib-core/actions/Action'
import { IACMessageType } from '@airgap/serializer'

import { LinkedAction } from '@airgap/coinlib-core/actions/LinkedAction'
import { SimpleAction } from '@airgap/coinlib-core/actions/SimpleAction'
import { ICoinSubProtocol, SubProtocolType } from '@airgap/coinlib-core/protocols/ICoinSubProtocol'
import { CosmosDelegationActionType } from '@airgap/cosmos-core'
import { TezosShieldedTezProtocol } from '@airgap/tezos'
import { StellarAssetProtocol, StellarProtocol, StellarSigner } from '@airgap/stellar'

import { AccountTransactionListPage } from '../pages/account-transaction-list/account-transaction-list'
import { DataServiceKey } from '../services/data/data.service'
import { ErrorCategory, handleErrorSentry } from '../services/sentry-error-handler/sentry-error-handler'

import { AddTokenAction, AddTokenActionContext } from './actions/AddTokenAction'
import { ButtonAction, ButtonActionContext } from './actions/ButtonAction'
import { CollectiblesAction } from './actions/CollectiblesAction'
import { AirGapDelegatorAction, AirGapDelegatorActionContext } from './actions/DelegatorAction'
import { FundAccountAction } from './actions/FundAccountAction'
import { SetContractAction } from './actions/SetContractAction'
import { TezosImportKtAccountAction, TezosImportKtAccountActionContext } from './actions/TezosImportKtAccountAction'
import { AirGapTezosMigrateAction } from './actions/TezosMigrateAction'

interface DelegatorButtonActionContext extends ButtonActionContext {
  type: any
  data?: any
}

export interface WalletActionInfo {
  name: string
  icon: string
}

export class ActionGroup {
  public constructor(private readonly callerContext: AccountTransactionListPage) {}

  public async getActions(): Promise<Action<any, any>[]> {
    const actionMap: Map<string, () => Promise<Action<any, any>[]>> = new Map()
    actionMap.set(MainProtocolSymbols.XTZ, async () => {
      return this.getTezosActions()
    })
    actionMap.set(SubProtocolSymbols.XTZ_KT, async () => {
      return this.getTezosKTActions()
    })
    actionMap.set(MainProtocolSymbols.XTZ_SHIELDED, async () => {
      return this.getTezosShieldedTezActions()
    })
    actionMap.set(MainProtocolSymbols.ETH, async () => {
      return this.getEthereumActions()
    })
    actionMap.set(MainProtocolSymbols.COSMOS, async () => {
      return this.getCosmosActions()
    })
    actionMap.set(MainProtocolSymbols.COREUM, async () => {
      return this.getCoreumActions()
    })
    actionMap.set(MainProtocolSymbols.POLKADOT, async () => {
      return this.getPolkadotActions()
    })
    actionMap.set(MainProtocolSymbols.KUSAMA, async () => {
      return this.getKusamaActions()
    })
    actionMap.set(MainProtocolSymbols.MOONBASE, async () => {
      return this.getMoonbeamActions()
    })
    actionMap.set(MainProtocolSymbols.MOONRIVER, async () => {
      return this.getMoonbeamActions()
    })
    actionMap.set(MainProtocolSymbols.MOONBEAM, async () => {
      return this.getMoonbeamActions()
    })
    actionMap.set(MainProtocolSymbols.ICP, async () => {
      return this.getICPActions()
    })
    actionMap.set(MainProtocolSymbols.OPTIMISM, async () => {
      return this.getOptimismActions()
    })

    actionMap.set(MainProtocolSymbols.STELLAR, async () => {
      return this.getStellarActions()
    })

    if (this.callerContext.wallet.protocol.identifier.startsWith(SubProtocolSymbols.STELLAR_ASSET)) {
      actionMap.set(this.callerContext.wallet.protocol.identifier, async () => {
        return this.getStellarAssetsActions()
      })
    }

    const currentIdentifier = await this.callerContext.wallet.protocol.getIdentifier()
    const currentMainIdentifier = currentIdentifier.split('-')[0]

    if (!actionMap.has(currentMainIdentifier)) {
      const subProtocols = await this.callerContext.protocolService.getAllSubProtocols(currentMainIdentifier as MainProtocolSymbols)
      const tokenSubProtocols = Object.values(subProtocols)
        .flatMap((subProtocol: ICoinSubProtocol) => subProtocol.subProtocolType)
        .filter((type: SubProtocolType) => type === SubProtocolType.TOKEN)

      if (tokenSubProtocols.length > 0) {
        actionMap.set(currentMainIdentifier, async () => {
          return [this.getAddTokensAction()]
        })
      }
    }

    const actionFunction: () => Promise<Action<any, any>[]> | undefined = actionMap.get(this.callerContext.protocolIdentifier)

    return actionFunction ? actionFunction() : []
  }

  private async getStellarActions(): Promise<Action<any, any>[]> {
    const addTokenButtonAction: Action<void, void> = this.getAddTokensAction()
    const addSignXDRButtonAction: Action<void, void> = this.getSignXDRAction()

    const stellarActions = [addTokenButtonAction, addSignXDRButtonAction]

    const adapter = this.callerContext.wallet.protocol as ICoinProtocolAdapter<StellarProtocol>

    const multisigSigners = await adapter.protocolV1.getSigners({
      value: this.callerContext.wallet.publicKey,
      type: 'pub',
      format: 'hex'
    })

    if (multisigSigners.length > 1) {
      const addPresentManageMultiSigAction: Action<void, void> = this.getPresentManageMultiSigAction(multisigSigners)

      stellarActions.push(addPresentManageMultiSigAction)
    } else {
      const addEnableMultiSigAction: Action<void, void> = this.getEnableMultiSigAction()

      stellarActions.push(addEnableMultiSigAction)
    }

    return stellarActions
  }

  private getTezosActions(): Action<any, any>[] {
    const delegateButtonAction = this.createDelegateButtonAction()

    const collectiblesButton = new ButtonAction(
      { name: 'account-transaction-list.collectibles_label', icon: 'images', identifier: 'collectibles-action' },
      () => {
        return new CollectiblesAction({ wallet: this.callerContext.wallet, router: this.callerContext.router })
      }
    )

    //TODO: Move logic to sub-account-add.ts
    const addTokenButtonAction: Action<void, void> = this.getAddTokensAction()

    return [delegateButtonAction, collectiblesButton, addTokenButtonAction]
  }

  public getImportAccountsAction(): ButtonAction<string[], TezosImportKtAccountActionContext> {
    const importButtonAction: ButtonAction<string[], TezosImportKtAccountActionContext> = new ButtonAction(
      { name: 'account-transaction-list.import-accounts_label', icon: 'add-outline', identifier: 'import-accounts' },
      () => {
        const importAccountAction: TezosImportKtAccountAction = new TezosImportKtAccountAction({
          publicKey: this.callerContext.wallet.publicKey,
          protocolService: this.callerContext.protocolService
        })
        importAccountAction.onComplete = async (ktAddresses: string[]): Promise<void> => {
          if (ktAddresses.length === 0) {
            this.callerContext.showToast('No accounts to import.')
          } else {
            for (const [index] of ktAddresses.entries()) {
              await this.addKtAddress(this.callerContext.wallet, index, ktAddresses)
            }

            this.callerContext.router.navigateByUrl('/').catch(handleErrorSentry(ErrorCategory.NAVIGATION))
            this.callerContext.showToast('Accounts imported')
          }
        }
        return importAccountAction
      }
    )
    return importButtonAction
  }

  private getTezosKTActions(): Action<any, any>[] {
    const migrateAction: ButtonAction<void, void> = new ButtonAction(
      { name: 'account-transaction-list.migrate_label', icon: 'return-right', identifier: 'migrate-action' },
      () => {
        const action = new AirGapTezosMigrateAction({
          wallet: this.callerContext.wallet,
          alertCtrl: this.callerContext.alertCtrl,
          translateService: this.callerContext.translateService,
          protocolService: this.callerContext.protocolService,
          dataService: this.callerContext.dataService,
          router: this.callerContext.router
        })

        return action
      }
    )
    return [migrateAction]
  }

  private async getTezosShieldedTezActions(): Promise<Action<any, any>[]> {
    const shieldedTezProtocol: ICoinProtocol = await this.callerContext.protocolService.getProtocol(MainProtocolSymbols.XTZ_SHIELDED)
    if (!(shieldedTezProtocol instanceof ICoinProtocolAdapter)) {
      return []
    }
    const shieldedTezAdapter: ICoinProtocolAdapter<TezosShieldedTezProtocol> = shieldedTezProtocol

    const isContractSet = (await shieldedTezAdapter.protocolV1.getContractAddress()) !== undefined

    const setContract: ButtonAction<void, void> = new ButtonAction(
      {
        name: isContractSet ? 'account-transaction-list.change-contract_label' : 'account-transaction-list.set-contract_label',
        icon: 'construct-outline',
        identifier: 'set-contract-action'
      },
      () => {
        const action = new SetContractAction({
          wallet: this.callerContext.wallet,
          dataService: this.callerContext.dataService,
          router: this.callerContext.router
        })

        return action
      }
    )

    const fundAction: ButtonAction<void, void> = new ButtonAction(
      { name: 'account-transaction-list.fund_label', icon: 'logo-usd', identifier: 'fund-action' },
      () => {
        const action = new FundAccountAction({
          wallet: this.callerContext.wallet,
          accountProvider: this.callerContext.accountProvider,
          dataService: this.callerContext.dataService,
          router: this.callerContext.router
        })

        return action
      }
    )

    return [setContract, fundAction]
  }

  private async getCosmosActions(): Promise<Action<any, any>[]> {
    const delegateButtonAction = this.createDelegateButtonAction()
    const extraDelegatorButtonActions = await this.createDelegatorButtonActions({
      type: CosmosDelegationActionType.WITHDRAW_ALL_REWARDS,
      name: 'account-transaction-list.claim_rewards_label',
      icon: 'logo-usd',
      identifier: 'claim-rewards'
    })

    return [delegateButtonAction, ...extraDelegatorButtonActions]
  }

  private async getCoreumActions(): Promise<Action<any, any>[]> {
    const delegateButtonAction = this.createDelegateButtonAction()
    const extraDelegatorButtonActions = await this.createDelegatorButtonActions({
      type: CosmosDelegationActionType.WITHDRAW_ALL_REWARDS,
      name: 'account-transaction-list.claim_rewards_label',
      icon: 'logo-usd',
      identifier: 'claim-rewards'
    })

    return [delegateButtonAction, ...extraDelegatorButtonActions]
  }

  private getEthereumActions(): Action<any, any>[] {
    const addTokenButtonAction: Action<void, void> = this.getAddTokensAction()

    return [addTokenButtonAction]
  }

  private getPolkadotActions(): Action<any, any>[] {
    const delegateButtonAction = this.createDelegateButtonAction()

    return [delegateButtonAction]
  }

  private getKusamaActions(): Action<any, any>[] {
    const delegateButtonAction = this.createDelegateButtonAction()

    return [delegateButtonAction]
  }

  private getMoonbeamActions(): Action<any, any>[] {
    const delegateButtonAction = this.createDelegateButtonAction()

    return [delegateButtonAction]
  }

  private async getICPActions(): Promise<Action<any, any>[]> {
    const delegateButtonAction = this.createDelegateButtonAction()
    return [delegateButtonAction]
  }

  private getOptimismActions(): Action<any, any>[] {
    const addTokenButtonAction: Action<void, void> = this.getAddTokensAction()

    return [addTokenButtonAction]
  }

  private getStellarAssetsActions(): Action<any, any>[] {
    const addTrustLineButtonAction: Action<void, void> = this.getAddTrustLineAction()

    return [addTrustLineButtonAction]
  }

  private getAddTokensAction(): Action<any, any> {
    return new ButtonAction({ name: 'account-transaction-list.add-tokens_label', icon: 'add-outline', identifier: 'add-tokens' }, () => {
      const prepareAddTokenActionContext: SimpleAction<AddTokenActionContext> = new SimpleAction(() => {
        return new Promise<AddTokenActionContext>(async (resolve) => {
          const info = {
            subProtocolType: SubProtocolType.TOKEN,
            wallet: this.callerContext.wallet,
            actionCallback: resolve
          }
          this.callerContext.dataService.setData(DataServiceKey.DETAIL, info)
          this.callerContext.router
            .navigateByUrl(
              `/sub-account-add/${DataServiceKey.DETAIL}/${info.wallet.publicKey}/${info.wallet.protocol.identifier}/${info.wallet.addressIndex}/${info.subProtocolType}`
            )
            .catch(handleErrorSentry(ErrorCategory.NAVIGATION))
        })
      })
      const addTokenAction: LinkedAction<void, AddTokenActionContext> = new LinkedAction(prepareAddTokenActionContext, AddTokenAction)
      addTokenAction.onComplete = async (): Promise<void> => {
        addTokenAction.getLinkedAction().context.location.navigateRoot('')
      }

      return addTokenAction
    })
  }

  private getPresentManageMultiSigAction(multisigSigners: StellarSigner[]): Action<any, any> {
    return new ButtonAction(
      { name: 'account-transaction-list.manage_multisig', icon: 'construct-outline', identifier: 'manage-multisig' },
      () =>
        new SimpleAction(() => {
          return this.presentManageMultiSigAlert(multisigSigners)
        })
    )
  }

  private async showValidationAlert(message: string): Promise<void> {
    const warningAlert = await this.callerContext.alertCtrl.create({
      header: 'Invalid Input',
      message,
      buttons: ['OK']
    })
    await warningAlert.present()
  }

  private async presentManageMultiSigAlert(multisigSigners: StellarSigner[]): Promise<void> {
    const parseAndValidateNumber = async (value: any, label: string): Promise<number | null> => {
      const parsed = parseInt(value, 10)
      if (isNaN(parsed) || parsed < 0) {
        await this.showValidationAlert(`${label} must be a non-negative number`)
        return null
      }
      return parsed
    }

    const alert = await this.callerContext.alertCtrl.create({
      header: `Update Multisig Parameters`,
      message: `Enter weight as 0 to remove a signer`,
      inputs: [
        {
          name: 'signer',
          type: 'text',
          placeholder: `Signer's public key`
        },
        {
          name: 'weight',
          type: 'number',
          placeholder: 'Signer Weight',
          min: 0
        },
        {
          name: 'lowThreshold',
          type: 'number',
          placeholder: 'Low Threshold',
          min: 0
        },
        {
          name: 'medThreshold',
          type: 'number',
          placeholder: 'Medium Threshold',
          min: 0
        },
        {
          name: 'highThreshold',
          type: 'number',
          placeholder: 'High Threshold',
          min: 0
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Update MultiSig',
          handler: async (data) => {
            if (!data || !data.signer) {
              await this.showValidationAlert('Signer public key is required')
              return false
            }

            const weight = await parseAndValidateNumber(data.weight, 'Weight')
            const lowThreshold = await parseAndValidateNumber(data.lowThreshold, 'Low threshold')
            const medThreshold = await parseAndValidateNumber(data.medThreshold, 'Medium threshold')
            const highThreshold = await parseAndValidateNumber(data.highThreshold, 'High threshold')

            if (weight === null || lowThreshold === null || medThreshold === null || highThreshold === null) {
              return false
            }

            if (lowThreshold > medThreshold) {
              await this.showValidationAlert('Medium threshold must be equal to or greater than low threshold')
              return false
            }

            if (medThreshold > highThreshold) {
              await this.showValidationAlert('High threshold must be equal to or greater than medium threshold')
              return false
            }

            const signerExists = multisigSigners.some((item) => item.key === data.signer)

            const totalWeight = multisigSigners.reduce(
              (sum, signer) => {
                return sum + (signer.key === data.signer ? weight : signer.weight || 0)
              },
              signerExists ? 0 : weight
            )

            if (totalWeight < highThreshold) {
              await this.showValidationAlert('High threshold must not exceed expected new total signer weight')
              return false
            }

            const adapter = this.callerContext.wallet.protocol as ICoinProtocolAdapter<StellarProtocol>

            try {
              const setOptionUnsignedTx = await adapter.protocolV1.adjustSigner(
                {
                  value: this.callerContext.wallet.publicKey,
                  type: 'pub',
                  format: 'hex'
                },
                {
                  value: data.signer,
                  type: 'pub',
                  format: 'encoded'
                },
                weight,
                lowThreshold,
                medThreshold,
                highThreshold
              )

              const airGapTxs = await this.callerContext.wallet.protocol.getTransactionDetails({
                publicKey: this.callerContext.wallet.publicKey,
                transaction: setOptionUnsignedTx
              })

              this.callerContext.accountProvider.startInteraction(
                this.callerContext.wallet,
                setOptionUnsignedTx,
                IACMessageType.TransactionSignRequest,
                airGapTxs
              )

              return true
            } catch (error) {
              console.error('Transaction Details error:', error)
              await this.showValidationAlert(error.message)
              return false
            }
          }
        }
      ]
    })

    await alert.present()
  }

  private getEnableMultiSigAction(): Action<any, any> {
    return new ButtonAction(
      { name: 'account-transaction-list.enable_multisig', icon: 'add-outline', identifier: 'enable-multisig' },
      () =>
        new SimpleAction(() => {
          return this.presentEnableMultiSigAlert()
        })
    )
  }

  private async presentEnableMultiSigAlert(): Promise<void> {
    const alert = await this.callerContext.alertCtrl.create({
      header: `Add signer`,
      message: `Input Signer`,
      inputs: [
        {
          name: 'signer',
          type: 'text',
          placeholder: `Signer's public key`
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Add Signer',
          handler: async (data) => {
            if (!data) {
              return false
            }

            const adapter = this.callerContext.wallet.protocol as ICoinProtocolAdapter<StellarProtocol>

            try {
              const setOptionUnsignedTx = await adapter.protocolV1.adjustSigner(
                {
                  value: this.callerContext.wallet.publicKey,
                  type: 'pub',
                  format: 'hex'
                },
                {
                  value: data.signer,
                  type: 'pub',
                  format: 'encoded'
                },
                10,
                20,
                20,
                20
              )

              const airGapTxs = await this.callerContext.wallet.protocol.getTransactionDetails({
                publicKey: this.callerContext.wallet.publicKey,
                transaction: setOptionUnsignedTx
              })

              this.callerContext.accountProvider.startInteraction(
                this.callerContext.wallet,
                setOptionUnsignedTx,
                IACMessageType.TransactionSignRequest,
                airGapTxs
              )

              return true
            } catch (error) {
              await this.showValidationAlert(error.message)
              return false
            }
          }
        }
      ]
    })

    await alert.present()
  }

  private getSignXDRAction(): Action<any, any> {
    return new ButtonAction(
      { name: 'Sign XDR', icon: 'add-outline', identifier: 'sign-xdr' },
      () =>
        new SimpleAction(() => {
          return this.presentXDRAcceptAlert()
        })
    )
  }

  private async presentXDRAcceptAlert(): Promise<void> {
    const alert = await this.callerContext.alertCtrl.create({
      header: `XDR signer`,
      message: `Input XDR to sign`,
      inputs: [
        {
          name: 'xdr',
          type: 'text',
          placeholder: 'Input XDR'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Sign',
          handler: async (data) => {
            if (!data) {
              return false
            }

            try {
              const unsignedTx = { transaction: data.xdr, type: 'unsigned' }

              const airGapTxs = await this.callerContext.wallet.protocol.getTransactionDetails({
                publicKey: this.callerContext.wallet.publicKey,
                transaction: unsignedTx
              })

              this.callerContext.accountProvider.startInteraction(
                this.callerContext.wallet,
                unsignedTx,
                IACMessageType.TransactionSignRequest,
                airGapTxs
              )

              return true
            } catch (error) {
              await this.showValidationAlert(error.message)

              return false
            }
          }
        }
      ]
    })

    await alert.present()
  }

  private getAddTrustLineAction(): Action<any, any> {
    return new ButtonAction(
      { name: 'account-transaction-list.set_trustline', icon: 'add-outline', identifier: 'change-trustline' },
      () =>
        new SimpleAction(() => {
          const adapter = this.callerContext.wallet.protocol as ICoinProtocolAdapter<StellarAssetProtocol>
          const assetCode = adapter.protocolV1.metadata.assetCode
          return this.presentTrustlineAmountAlert(assetCode)
        })
    )
  }

  private async presentTrustlineAmountAlert(assetCode: string): Promise<void> {
    const alert = await this.callerContext.alertCtrl.create({
      header: `Set Trustline for ${assetCode}`,
      message: `Enter the amount of ${assetCode} you want to trust. \n Leave blank to allow the maximum. \n Amount will appear as 0 on the QR since no asset is spent.`,
      inputs: [
        {
          name: 'limit',
          type: 'number',
          placeholder: 'Trustline Amount (e.g. 1000000)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Set',
          handler: async (data) => {
            const limit = data.limit && !isNaN(data.limit) ? data.limit : undefined

            try {
              const adapter = this.callerContext.wallet.protocol as ICoinProtocolAdapter<StellarAssetProtocol>

              const unsignTrustLineTx = await adapter.protocolV1.setTrustline(
                {
                  value: this.callerContext.wallet.publicKey,
                  type: 'pub',
                  format: 'hex'
                },
                adapter.protocolV1.metadata,
                limit
              )

              const airGapTxs = await this.callerContext.wallet.protocol.getTransactionDetails({
                publicKey: this.callerContext.wallet.publicKey,
                transaction: unsignTrustLineTx
              })

              this.callerContext.accountProvider.startInteraction(
                this.callerContext.wallet,
                unsignTrustLineTx,
                IACMessageType.TransactionSignRequest,
                airGapTxs
              )

              return true
            } catch (error) {
              console.error(error)
              return false
            }
          }
        }
      ]
    })

    await alert.present()
  }

  private async addKtAddress(xtzWallet: AirGapMarketWallet, index: number, ktAddresses: string[]): Promise<AirGapMarketWallet> {
    let wallet = this.callerContext.accountProvider.walletByPublicKeyAndProtocolAndAddressIndex(
      xtzWallet.publicKey,
      SubProtocolSymbols.XTZ_KT,
      index
    )

    if (wallet) {
      return wallet
    }

    const xtzWalletGroup = this.callerContext.accountProvider.findWalletGroup(xtzWallet)
    const protocol: ICoinProtocol = await this.callerContext.protocolService.getProtocol(SubProtocolSymbols.XTZ_KT)

    wallet = new AirGapCoinWallet(
      protocol,
      xtzWallet.publicKey,
      xtzWallet.isExtendedPublicKey,
      xtzWallet.derivationPath,
      xtzWallet.masterFingerprint,
      xtzWallet.status,
      xtzWallet.priceService,
      index
    )
    wallet.addresses = ktAddresses
    await wallet.synchronize().catch(handleErrorSentry(ErrorCategory.COINLIB))
    const walletAddInfos = [
      {
        walletToAdd: wallet,
        groupId: xtzWalletGroup !== undefined ? xtzWalletGroup.id : undefined,
        groupLabel: xtzWalletGroup !== undefined ? xtzWalletGroup.label : undefined
      }
    ]
    await this.callerContext.accountProvider.addWallets(walletAddInfos).catch(handleErrorSentry(ErrorCategory.WALLET_PROVIDER))

    return wallet
  }

  private createDelegateButtonAction(): ButtonAction<void, void> {
    const label =
      this.callerContext.protocolIdentifier === MainProtocolSymbols.XTZ
        ? 'account-transaction-list.delegate_tezos_label'
        : 'account-transaction-list.delegate_label'
    return new ButtonAction({ name: label, icon: 'logo-usd', identifier: 'delegate-action' }, () => {
      return new SimpleAction(() => {
        return new Promise<void>((resolve) => {
          const info = {
            wallet: this.callerContext.wallet
          }
          this.callerContext.dataService.setData(DataServiceKey.DETAIL, info)
          this.callerContext.router
            .navigateByUrl(
              `/delegation-detail/${DataServiceKey.DETAIL}/${this.callerContext.wallet.publicKey}/${this.callerContext.wallet.protocol.identifier}/${this.callerContext.wallet.addressIndex}`
            )
            .catch(handleErrorSentry(ErrorCategory.NAVIGATION))

          resolve()
        })
      })
    })
  }

  private async createDelegatorButtonActions(
    ...contexts: DelegatorButtonActionContext[]
  ): Promise<ButtonAction<void, AirGapDelegatorActionContext>[]> {
    try {
      const delegatorDetails = await this.callerContext.operationsProvider.getDelegatorDetails(this.callerContext.wallet)

      if (delegatorDetails.availableActions) {
        const availableActionTypes = delegatorDetails.availableActions.map((action) => action.type)
        return contexts
          .filter((context) => availableActionTypes.includes(context.type))
          .map((context) => {
            return new ButtonAction<void, AirGapDelegatorActionContext>(context, () => {
              return new AirGapDelegatorAction({
                wallet: this.callerContext.wallet,
                type: context.type,
                data: context.data,
                toastController: this.callerContext.toastController,
                loadingController: this.callerContext.loadingController,
                operationsProvider: this.callerContext.operationsProvider,
                dataService: this.callerContext.dataService,
                accountService: this.callerContext.accountProvider
              })
            })
          })
      }
    } catch (error) {
      console.warn(error)
    }

    return []
  }
}
