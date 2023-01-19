import { ProtocolService, UiEventService } from '@airgap/angular-core'
import {
  AirGapCoinWallet,
  AirGapMarketWallet,
  hasConfigurableContract,
  IAirGapTransaction,
  ICoinProtocol,
  MainProtocolSymbols,
  ProtocolNetwork,
  SerializedAirGapWallet,
} from '@airgap/coinlib-core'
import { AirGapWalletStatus } from '@airgap/coinlib-core/wallet/AirGapWallet'
import { IACMessageType } from '@airgap/serializer'
import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { PushNotificationSchema } from '@capacitor/push-notifications'
import { AlertController, LoadingController, PopoverController, ToastController } from '@ionic/angular'
import { Observable, ReplaySubject, Subject } from 'rxjs'
import { auditTime, map, take } from 'rxjs/operators'

import { DelegateAlertAction } from '../../models/actions/DelegateAlertAction'
import { AirGapTipUsAction } from '../../models/actions/TipUsAction'
import { AirGapMarketWalletGroup, InteractionSetting, SerializedAirGapMarketWalletGroup } from '../../models/AirGapMarketWalletGroup'
import { isType } from '../../utils/utils'
import { AppService } from '../app/app.service'
import { DataService } from '../data/data.service'
import { DrawChartService } from '../draw-chart/draw-chart.service'
import { InteractionService } from '../interaction/interaction.service'
import { OperationsProvider } from '../operations/operations'
import { PriceService } from '../price/price.service'
import { PushProvider } from '../push/push'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'
import { WalletStorageKey, WalletStorageService } from '../storage/storage'

enum NotificationKind {
  CTA_Tip = 'cta_tip',
  CTA_Delegate = 'cta_delegate'
}

interface CTAInfo {
  kind: NotificationKind
  fromAddress: string
  toAddress: string
  amount: string
  alertTitle: string
  alertDescription: string
}

export interface WalletAddInfo {
  walletToAdd: AirGapMarketWallet
  groupId?: string
  groupLabel?: string
  options?: { override?: boolean; updateState?: boolean }
}

export type ImplicitWalletGroup = 'all'
export type ActiveWalletGroup = AirGapMarketWalletGroup | ImplicitWalletGroup

@Injectable({
  providedIn: 'root'
})
export class AccountProvider {
  private readonly activeGroup$: ReplaySubject<ActiveWalletGroup> = new ReplaySubject(1)
  private readonly walletGroups: Map<string | undefined, AirGapMarketWalletGroup> = new Map()

  public walletsHaveLoaded: ReplaySubject<boolean> = new ReplaySubject(1)

  public refreshPageSubject: Subject<void> = new Subject()

  public walletGroups$: ReplaySubject<AirGapMarketWalletGroup[]> = new ReplaySubject(1)
  public wallets$: ReplaySubject<AirGapMarketWallet[]> = new ReplaySubject(1)
  public allWallets$: ReplaySubject<AirGapMarketWallet[]> = new ReplaySubject(1)
  public subWallets$: ReplaySubject<AirGapMarketWallet[]> = new ReplaySubject(1)
  public usedProtocols$: ReplaySubject<ICoinProtocol[]> = new ReplaySubject(1)

  private readonly walletChangedBehaviour: Subject<void> = new Subject()

  get walletChangedObservable() {
    return this.walletChangedBehaviour.asObservable().pipe(auditTime(50))
  }

  public get allWalletGroups(): AirGapMarketWalletGroup[] {
    return Array.from(this.walletGroups.values())
  }

  private get allWallets(): AirGapMarketWallet[] {
    return this.allWalletGroups.reduce((wallets: AirGapMarketWallet[], group: AirGapMarketWalletGroup) => wallets.concat(group.wallets), [])
  }

  constructor(
    private readonly appService: AppService,
    private readonly storageProvider: WalletStorageService,
    private readonly pushProvider: PushProvider,
    private readonly drawChartProvider: DrawChartService,
    private readonly popoverController: PopoverController,
    private readonly uiEventService: UiEventService,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController,
    private readonly loadingController: LoadingController,
    private readonly opertaionsProvider: OperationsProvider,
    private readonly dataService: DataService,
    private readonly router: Router,
    private readonly interactionService: InteractionService,
    private readonly priceService: PriceService,
    private readonly protocolService: ProtocolService
  ) {
    this.loadWalletsFromStorage()
      .then(() => {
        this.walletsHaveLoaded.next(true)
      })
      .catch(console.error)
    this.wallets$.pipe(map((wallets) => wallets.filter((wallet) => 'subProtocolType' in wallet.protocol))).subscribe(this.subWallets$)
    this.wallets$.pipe(map((wallets) => this.getProtocolsFromWallets(wallets))).subscribe(this.usedProtocols$)

    this.pushProvider.notificationCallback = (notification: PushNotificationSchema): void => {
      // We need a timeout because otherwise routing might fail

      const env = {
        popoverController: this.popoverController,
        loadingController: this.loadingController,
        uiEventService: this.uiEventService,
        alertController: this.alertController,
        toastController: this.toastController,
        operationsProvider: this.opertaionsProvider,
        dataService: this.dataService,
        accountService: this,
        router: this.router
      }

      if (notification && isType<CTAInfo>(notification.data)) {
        const tippingInfo: CTAInfo = notification.data

        if (tippingInfo.kind === NotificationKind.CTA_Tip) {
          const originWallet: AirGapMarketWallet = this.getActiveWalletList().find((wallet: AirGapMarketWallet) =>
            wallet.addresses.some((address: string) => address === tippingInfo.fromAddress)
          )
          setTimeout(() => {
            const tipAction: AirGapTipUsAction = new AirGapTipUsAction({
              wallet: originWallet,
              tipAddress: tippingInfo.toAddress,
              amount: tippingInfo.amount,
              alertTitle: tippingInfo.alertTitle,
              alertDescription: tippingInfo.alertDescription,
              ...env
            })

            tipAction.start()
          }, 3500)
        }

        if (tippingInfo.kind === NotificationKind.CTA_Delegate) {
          const originWallet: AirGapMarketWallet = this.getActiveWalletList().find((wallet: AirGapMarketWallet) =>
            wallet.addresses.some((address: string) => address === tippingInfo.fromAddress)
          )
          setTimeout(() => {
            const delegateAlertAction: DelegateAlertAction = new DelegateAlertAction({
              wallet: originWallet,
              delegate: tippingInfo.toAddress,
              alertTitle: tippingInfo.alertTitle,
              alertDescription: tippingInfo.alertDescription,
              ...env
            })

            delegateAlertAction.start()
          }, 3500)
        }
      }
    }
  }

  public startInteraction(
    wallet: AirGapMarketWallet,
    interactionData: unknown,
    type: IACMessageType,
    airGapTxs?: IAirGapTransaction[],
    isRelay: boolean = false,
    generatedId?: number
  ) {
    const group = this.walletGroupByWallet(wallet)
    this.interactionService.startInteraction(group, wallet, interactionData, type, airGapTxs, isRelay, generatedId)
  }

  public getActiveWalletGroupObservable(): Observable<ActiveWalletGroup> {
    return this.activeGroup$.asObservable()
  }

  public getWalletGroupsObservable(): Observable<AirGapMarketWalletGroup[]> {
    return this.walletGroups$.asObservable().pipe(map((groups: AirGapMarketWalletGroup[]) => this.sortGroupsByLabel(groups)))
  }

  public triggerWalletChanged() {
    this.walletChangedBehaviour.next()
  }

  private getProtocolsFromWallets(wallets: AirGapMarketWallet[]) {
    const protocols: Map<string, ICoinProtocol> = new Map()
    wallets.forEach((wallet) => {
      if (!protocols.has(wallet.protocol.identifier)) {
        protocols.set(wallet.protocol.identifier, wallet.protocol)
      }
    })

    return Array.from(protocols.values())
  }

  public hasInactiveWallets(protocol: ICoinProtocol): boolean {
    return this.allWallets.some(
      (wallet: AirGapMarketWallet) => wallet.protocol.identifier === protocol.identifier && wallet.status !== AirGapWalletStatus.ACTIVE
    )
  }

  private async loadWalletsFromStorage() {
    await this.appService.waitReady()

    const [rawGroups, rawWallets]: [
      SerializedAirGapMarketWalletGroup[] | undefined,
      SerializedAirGapWallet[] | undefined
    ] = await Promise.all([this.storageProvider.get(WalletStorageKey.WALLET_GROUPS), this.storageProvider.get(WalletStorageKey.WALLET)])

    const groups = rawGroups || []
    let wallets = rawWallets || []

    // migrating double-serialization
    if (!(rawWallets instanceof Array)) {
      try {
        wallets = JSON.parse(rawWallets)
      } catch (e) {
        wallets = []
      }
    }

    // "wallets" can be undefined here
    if (!wallets) {
      wallets = []
    }

    const walletMap: Record<string, SerializedAirGapWallet | undefined> = wallets.reduce(
      (obj: Record<string, SerializedAirGapWallet>, next: SerializedAirGapWallet) =>
        Object.assign(obj, { [this.createWalletIdentifier(next.protocolIdentifier, next.publicKey)]: next }),
      {}
    )
    
    const walletInitPromises: Promise<void>[] = []

    // read groups
    await Promise.all(
      groups.map(async (group: SerializedAirGapMarketWalletGroup) => {
        const wallets: AirGapMarketWallet[] = (
          await Promise.all(
            group.wallets.map(async ([protocolIdentifier, publicKey]: [string, string]) => {
              const walletIdentifier: string = this.createWalletIdentifier(protocolIdentifier, publicKey)
              const serializedWallet: SerializedAirGapWallet | undefined = walletMap[walletIdentifier]
              if (serializedWallet === undefined) {
                return undefined
              }
              walletMap[walletIdentifier] = undefined
              const airGapWallet = await this.readSerializedWallet(serializedWallet)
              if (airGapWallet !== undefined) {
                walletInitPromises.push(this.initializeWallet(airGapWallet)) 
              }
              return airGapWallet
            })
          )
        ).filter((wallet: AirGapMarketWallet | undefined) => wallet !== undefined)

        const walletGroup: AirGapMarketWalletGroup = new AirGapMarketWalletGroup(group.id, group.label, group.interactionSetting, wallets)

        this.walletGroups.set(walletGroup.id, walletGroup)
      })
    )

    // read ungrouped wallets
    const ungroupedWallets: AirGapMarketWallet[] = (await Promise.all(
      Object.values(walletMap)
        .filter((serializedWallet: SerializedAirGapWallet | undefined) => serializedWallet !== undefined)
        .map(async (serializedWallet: SerializedAirGapWallet) => {
          const airGapWallet = await this.readSerializedWallet(serializedWallet)
          if (airGapWallet !== undefined) {
            walletInitPromises.push(this.initializeWallet(airGapWallet))
          }
          return airGapWallet
        })
    )).filter((wallet: AirGapMarketWallet | undefined) => wallet !== undefined)

    if (ungroupedWallets.length > 0) {
      const others: AirGapMarketWalletGroup = new AirGapMarketWalletGroup(undefined, undefined, undefined, ungroupedWallets, true)
      this.walletGroups.set(others.id, others)
    }

    Promise.all(walletInitPromises).then(() => {
      this.triggerWalletChanged()
    })

    if (this.allWallets.length > 0) {
      this.pushProvider.setupPush()
    }
    
    this.setActiveGroup(this.allWalletGroups.length > 1 ? 'all' : this.allWalletGroups[0])
    this.walletGroups$.next(this.allWalletGroups)
    this.pushProvider.registerWallets(this.allWallets)
  }

  private async readSerializedWallet(serializedWallet: SerializedAirGapWallet): Promise<AirGapMarketWallet | undefined> {
    const protocol: ICoinProtocol = await this.protocolService.getProtocol(
      serializedWallet.protocolIdentifier,
      serializedWallet.networkIdentifier
    )
    if (protocol.identifier !== serializedWallet.protocolIdentifier) {
      return undefined
    }
    const airGapWallet: AirGapMarketWallet = new AirGapCoinWallet(
      protocol,
      serializedWallet.publicKey,
      serializedWallet.isExtendedPublicKey,
      serializedWallet.derivationPath,
      serializedWallet.masterFingerprint || '',
      serializedWallet.status || AirGapWalletStatus.ACTIVE,
      this.priceService,
      serializedWallet.addressIndex
    )
    // add derived addresses
    airGapWallet.addresses = serializedWallet.addresses

    return airGapWallet
  }

  private async initializeWallet(airGapWallet: AirGapMarketWallet): Promise<void> {
    return new Promise<void>((resolve) => {
      // if we have no addresses, derive using webworker and sync, else just sync
      if (airGapWallet.addresses.length === 0 || (airGapWallet.isExtendedPublicKey && airGapWallet.addresses.length < 20)) {
        const airGapWorker = new Worker('./assets/workers/airgap-coin-lib.js')

        airGapWorker.onmessage = (event) => {
          airGapWallet.addresses = event.data.addresses
          if (airGapWallet.status === AirGapWalletStatus.ACTIVE) {
            airGapWallet
            .synchronize()
            .then(() => {
              resolve()
            })
            .catch((error) => {
              console.error(error)
              resolve()
            })
          } else {
            resolve()
          }
        }

        airGapWorker.postMessage({
          protocolIdentifier: airGapWallet.protocol.identifier,
          publicKey: airGapWallet.publicKey,
          isExtendedPublicKey: airGapWallet.isExtendedPublicKey,
          derivationPath: airGapWallet.derivationPath,
          addressIndex: airGapWallet.addressIndex
        })
      } else if (airGapWallet.status === AirGapWalletStatus.ACTIVE) {
        airGapWallet
          .synchronize()
          .then(() => {
            resolve()
          })
          .catch((error) => {
            console.error(error)
            resolve()
          })
      } else {
        resolve()
      }
    })
  }

  public getWalletList(): AirGapMarketWallet[] {
    return this.allWallets
  }

  public getActiveWalletList(): AirGapMarketWallet[] {
    return this.allWallets.filter(wallet => wallet.status === AirGapWalletStatus.ACTIVE)
  }

  public setActiveGroup(groupToSet: AirGapMarketWalletGroup | ImplicitWalletGroup | undefined): void {
    if (groupToSet === 'all') {
      this.activeGroup$.next(groupToSet)
      this.wallets$.next(this.allWallets)
    } else if (groupToSet !== undefined && this.walletGroups.has(groupToSet.id)) {
      const group: AirGapMarketWalletGroup = this.walletGroups.get(groupToSet.id)
      const wallets: AirGapMarketWallet[] = group.wallets

      this.activeGroup$.next(group)
      this.wallets$.next(wallets)
    } else {
      this.wallets$.next([])
    }
    this.allWallets$.next(this.allWallets)
  }

  public async addWallets(walletAddInfos: WalletAddInfo[]): Promise<void> {
    let existingWallets = []
    for (let walletAddInfo of walletAddInfos) {
      const defaultOptions = {
        override: false,
        updateState: true
      }

      const resolvedOptions = {
        ...defaultOptions,
        ...(walletAddInfo.options ?? {})
      }

      const alreadyExists: boolean = this.walletExists(walletAddInfo.walletToAdd)
      if (alreadyExists) {
        existingWallets.push(walletAddInfo.walletToAdd)
        if (!resolvedOptions.override) {
          throw new Error('wallet already exists')
        }
      }
      await this.addWallet(walletAddInfo, resolvedOptions)
    }

    const activeNewWallets = walletAddInfos
      .filter(
        (walletAddInfo) =>
          walletAddInfo.walletToAdd.status === AirGapWalletStatus.ACTIVE &&
          !existingWallets.some(
            (wallet: AirGapMarketWallet) =>
              this.isSameWallet(wallet, walletAddInfo.walletToAdd) && wallet.status === walletAddInfo.walletToAdd.status
          )
      )
      .map((walletAddInfo) => walletAddInfo.walletToAdd)

    await this.registerToPushBackend(activeNewWallets)
    this.drawChartProvider.drawChart()
  }

  private async addWallet(
    walletAddInfo: WalletAddInfo,
    resolvedOptions: {
      override: boolean
      updateState: boolean
    }
  ): Promise<void> {
    if (walletAddInfo.groupId === '') {
      walletAddInfo.groupId = undefined
    }
    if (walletAddInfo.groupLabel === '') {
      walletAddInfo.groupLabel = undefined
    }
  
    this.assertWalletGroupExists(walletAddInfo.groupId, walletAddInfo.groupLabel)
    this.assertWalletGroupUpdated(walletAddInfo.groupId, walletAddInfo.groupLabel)

    const walletGroup: AirGapMarketWalletGroup = this.walletGroups.get(walletAddInfo.groupId)
    this.addToGroup(walletGroup, walletAddInfo.walletToAdd)

    if (resolvedOptions.updateState) {
      this.setActiveGroup(walletGroup)
      this.walletGroups$.next(this.allWalletGroups)
      return this.persist()
    }
  }

  private assertWalletGroupExists(groupId: string | undefined, groupLabel: string | undefined): void {
    if (!this.walletGroups.has(groupId)) {
      this.walletGroups.set(groupId, new AirGapMarketWalletGroup(groupId, groupLabel, undefined, []))
    }
  }

  private assertWalletGroupUpdated(groupId: string | undefined, groupLabel: string | undefined): void {
    const walletGroup: AirGapMarketWalletGroup = this.walletGroups.get(groupId)
    if (walletGroup.label !== undefined && walletGroup.label !== groupLabel && groupLabel !== undefined) {
      walletGroup.updateLabel(groupLabel)
    }
  }

  private addToGroup(group: AirGapMarketWalletGroup, wallet: AirGapMarketWallet): void {
    const [oldGroupId, oldIndex]: [string | undefined, number] = this.findWalletGroupIdAndIndex(wallet)
    if (oldGroupId !== group.id && oldIndex > -1) {
      this.walletGroups.get(oldGroupId).wallets.splice(oldIndex, 1)
    }

    if (oldGroupId === group.id && oldIndex > -1) {
      group.wallets[oldIndex] = wallet
    } else {
      group.wallets.push(wallet)
    }

    group.updateStatus()
  }

  public async activateWallet(
    walletToActivate: AirGapMarketWallet,
    groupId: string,
    options: { updateState?: boolean } = {}
  ): Promise<void> {
    const defaultOptions = {
      updateState: true
    }

    const resolvedOptions = {
      ...defaultOptions,
      ...options
    }

    const walletGroup: AirGapMarketWalletGroup = this.walletGroups.get(groupId)

    const index: number = walletGroup.wallets.findIndex((wallet: AirGapMarketWallet) => this.isSameWallet(wallet, walletToActivate))
    if (index === -1) {
      return
    }

    walletGroup.wallets[index].status = AirGapWalletStatus.ACTIVE

    walletGroup.updateStatus()

    if (resolvedOptions.updateState) {
      this.setActiveGroup(walletGroup)
      this.walletGroups$.next(this.allWalletGroups)
      this.drawChartProvider.drawChart()

      return this.persist()
    }
  }

  public async removeWallet(walletToRemove: AirGapMarketWallet, options: { updateState?: boolean } = {}): Promise<void> {
    const defaultOptions = {
      updateState: true
    }

    const resolvedOptions = {
      ...defaultOptions,
      ...options
    }

    let group: AirGapMarketWalletGroup | undefined
    const [groupId, index]: [string | undefined, number] = this.findWalletGroupIdAndIndex(walletToRemove)
    if (this.walletGroups.has(groupId) && index > -1) {
      group = this.walletGroups.get(groupId)
      group.wallets[index].status = AirGapWalletStatus.DELETED
      group.updateStatus()
    }

    this.unregisterFromPushBackend(walletToRemove)

    if (resolvedOptions.updateState) {
      const activeGroup: ActiveWalletGroup =
        group !== undefined && group.status === AirGapWalletStatus.ACTIVE
          ? group
          : this.allWalletGroups.length > 1
          ? 'all'
          : this.allWalletGroups[0]
      this.setActiveGroup(activeGroup)
      this.walletGroups$.next(this.allWalletGroups)

      this.drawChartProvider.drawChart()

      return this.persist()
    }
  }

  private async registerToPushBackend(wallets: AirGapMarketWallet[]): Promise<void> {
    await this.pushProvider.setupPush()
    this.pushProvider.registerWallets(wallets).catch(handleErrorSentry(ErrorCategory.PUSH))
  }

  private unregisterFromPushBackend(wallet: AirGapMarketWallet): void {
    this.pushProvider.unregisterWallets([wallet]).catch(handleErrorSentry(ErrorCategory.PUSH))
  }

  public async setWalletNetwork(wallet: AirGapMarketWallet, network: ProtocolNetwork): Promise<void> {
    const protocol = await this.protocolService.getProtocol(wallet.protocol.identifier, network, true)
    await wallet.setProtocol(protocol)

    await this.persist()

    this.triggerWalletChanged()
  }

  public async updateWalletGroup(walletGroup: AirGapMarketWalletGroup) {
    this.walletGroups.set(walletGroup.id, walletGroup)
    return this.persist()
  }

  public walletGroupByWallet(wallet: AirGapMarketWallet): AirGapMarketWalletGroup {
    return this.allWalletGroups.find((group: AirGapMarketWalletGroup) => group.includesWallet(wallet))
  }

  public setInteractionSettingForWalletGroupByWallet(wallet: AirGapMarketWallet, interactionSetting: InteractionSetting): void {
    const group = this.walletGroupByWallet(wallet)
    group.interactionSetting = interactionSetting
    this.updateWalletGroup(group)
  }
  private async persist(): Promise<void> {
    await Promise.all([
      this.storageProvider.set(
        WalletStorageKey.WALLET_GROUPS,
        this.allWalletGroups
          .filter((group: AirGapMarketWalletGroup) => !group.transient)
          .map((group: AirGapMarketWalletGroup) => group.toJSON())
      ),
      this.storageProvider.set(
        WalletStorageKey.WALLET,
        await Promise.all(
          this.allWallets
            .filter((wallet: AirGapMarketWallet) => wallet.status !== AirGapWalletStatus.TRANSIENT)
            .map((wallet: AirGapMarketWallet) => wallet.toJSON())
        )
      )
    ])
  }

  public async getAccountIdentifier(wallet: AirGapMarketWallet): Promise<string> {
    const [protocolIdentifier, networkIdentifier] = await Promise.all([
      wallet.protocol.getIdentifier(),
      wallet.protocol.getOptions().then((options) => options.network.identifier)
    ])

    let extendedNetworkIdentifier: string = networkIdentifier
    if (hasConfigurableContract(wallet.protocol)) {
      const contractAddress = await wallet.protocol.getContractAddress()
      if (contractAddress) {
        extendedNetworkIdentifier += `:${contractAddress}`
      }
    }

    return wallet.addressIndex
      ? `${protocolIdentifier}-${wallet.publicKey}-${extendedNetworkIdentifier}-${wallet.addressIndex}`
      : `${protocolIdentifier}-${wallet.publicKey}-${extendedNetworkIdentifier}`
  }

  public walletBySerializerAccountIdentifier(accountIdentifier: string, protocolIdentifier: string): AirGapMarketWallet {
    return this.allWallets.find(
      (wallet) => wallet.publicKey.endsWith(accountIdentifier) && wallet.protocol.identifier === protocolIdentifier
    )
  }

  public walletByPublicKeyAndProtocolAndAddressIndex(
    publicKey: string,
    protocolIdentifier: string,
    addressIndex?: number
  ): AirGapMarketWallet {
    return this.allWallets.find(
      (wallet) =>
        wallet.publicKey === publicKey && wallet.protocol.identifier === protocolIdentifier && wallet.addressIndex === addressIndex
    )
  }

  public walletExists(testWallet: AirGapMarketWallet): boolean {
    return this.allWallets.some(
      (wallet: AirGapMarketWallet) => this.isSameWallet(wallet, testWallet) && wallet.status === testWallet.status
    )
  }

  public isSameWallet(wallet1: AirGapMarketWallet, wallet2: AirGapMarketWallet) {
    if (!(wallet1 instanceof AirGapMarketWallet) || !(wallet2 instanceof AirGapMarketWallet)) {
      return false
    }

    return (
      wallet1.publicKey === wallet2.publicKey &&
      wallet1.protocol.identifier === wallet2.protocol.identifier &&
      wallet1.addressIndex === wallet2.addressIndex
    )
  }

  public isSameGroup(group: ActiveWalletGroup, other: ActiveWalletGroup): boolean {
    if (typeof group === 'string' && typeof other === 'string') {
      return group === other
    } else if (typeof group === 'string') {
      return false
    } else if (typeof other === 'string') {
      return false
    } else {
      return group.id === other.id
    }
  }

  public findWalletGroup(testWallet: AirGapMarketWallet): AirGapMarketWalletGroup | undefined {
    for (const group of this.walletGroups.values()) {
      const index: number = group.wallets.findIndex((wallet: AirGapMarketWallet) => this.isSameWallet(wallet, testWallet))
      if (index !== -1) {
        return group
      }
    }

    return undefined
  }

  public findWalletGroupIdAndIndex(testWallet: AirGapMarketWallet): [string | undefined, number] {
    for (const group of this.walletGroups.values()) {
      const index: number = group.wallets.findIndex((wallet: AirGapMarketWallet) => this.isSameWallet(wallet, testWallet))
      if (index !== -1) {
        return [group.id, index]
      }
    }

    return [undefined, -1]
  }

  public getKnownViewingKeys(): string[] {
    return this.allWallets
      .filter((wallet: AirGapMarketWallet) => wallet.protocol.identifier === MainProtocolSymbols.XTZ_SHIELDED)
      .map((wallet: AirGapMarketWallet) => wallet.publicKey)
  }

  public async getCompatibleAndIncompatibleWalletsForAddress(
    address: string
  ): Promise<{
    compatibleWallets: AirGapMarketWallet[]
    incompatibleWallets: AirGapMarketWallet[]
  }> {
    return this.usedProtocols$
      .pipe(
        take(1),
        map((protocols) => {
          const compatibleProtocols: Map<string, ICoinProtocol> = new Map()

          protocols.forEach((protocol) => {
            const match = address.match(protocol.addressValidationPattern)
            if (match && match.length > 0) {
              compatibleProtocols.set(protocol.identifier, protocol)
            }
          })

          const compatibleWallets: AirGapMarketWallet[] = []
          const incompatibleWallets: AirGapMarketWallet[] = []

          this.allWallets.forEach((wallet) => {
            if (compatibleProtocols.has(wallet.protocol.identifier)) {
              compatibleWallets.push(wallet)
            } else {
              incompatibleWallets.push(wallet)
            }
          })

          return {
            compatibleWallets,
            incompatibleWallets
          }
        })
      )
      .toPromise()
  }

  private sortGroupsByLabel(groups: AirGapMarketWalletGroup[]): AirGapMarketWalletGroup[] {
    const othersIndex: number = groups.findIndex((group: AirGapMarketWalletGroup) => group.id === undefined)
    const others: AirGapMarketWalletGroup | undefined = othersIndex > -1 ? groups[othersIndex] : undefined

    const userDefinedGroups: AirGapMarketWalletGroup[] =
      othersIndex > -1 ? groups.slice(0, othersIndex).concat(groups.slice(othersIndex + 1)) : groups

    const sorted: AirGapMarketWalletGroup[] = userDefinedGroups.sort((a: AirGapMarketWalletGroup, b: AirGapMarketWalletGroup) =>
      a.label.localeCompare(b.label)
    )

    return others !== undefined ? [...sorted, others] : sorted
  }

  private createWalletIdentifier(protocolIdentifier: string, publicKey: string): string {
    return `${protocolIdentifier}_${publicKey}`
  }
}
