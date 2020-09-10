import { Inject, Injectable } from '@angular/core'
import { PermissionsPlugin, PermissionType } from '@capacitor/core'
import { Diagnostic } from '@ionic-native/diagnostic/ngx'
import { AlertController, Platform } from '@ionic/angular'
import { PERMISSIONS_PLUGIN } from 'src/app/capacitor-plugins/injection-tokens'

import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'
import { WalletStorageKey, WalletStorageService } from '../storage/storage'

export enum PermissionStatus {
  GRANTED = 'GRANTED',
  DENIED = 'DENIED',
  UNKNOWN = 'UNKNOWN'
}

export enum PermissionTypes {
  CAMERA = 'CAMERA',
  MICROPHONE = 'MICROPHONE'
}

@Injectable({
  providedIn: 'root'
})
export class PermissionsProvider {
  constructor(
    private readonly platform: Platform,
    private readonly diagnostic: Diagnostic,
    private readonly alertCtrl: AlertController,
    private readonly storage: WalletStorageService,
    @Inject(PERMISSIONS_PLUGIN) private readonly permissions: PermissionsPlugin
  ) {}

  public async hasCameraPermission(): Promise<PermissionStatus> {
    return this.checkPermission(PermissionType.Camera)
  }

  public async hasNotificationsPermission(): Promise<PermissionStatus> {
    return this.checkPermission(PermissionType.Notifications)
  }

  public async requestPermissions(permissions: PermissionTypes[]): Promise<void> {
    if (this.platform.is('android')) {
      const permissionsToRequest: string[] = []
      if (permissions.indexOf(PermissionTypes.CAMERA) >= 0) {
        permissionsToRequest.push(this.diagnostic.permission.CAMERA)
        await this.storage.set(WalletStorageKey.CAMERA_PERMISSION_ASKED, true)
      }
      await this.diagnostic.requestRuntimePermissions(permissionsToRequest)
    } else if (this.platform.is('ios')) {
      if (permissions.indexOf(PermissionTypes.CAMERA) >= 0) {
        await this.diagnostic.requestCameraAuthorization(false)
        await this.storage.set(WalletStorageKey.CAMERA_PERMISSION_ASKED, true)
      }
    } else {
      console.warn('requesting permission in browser')
    }
  }

  /**
   * The user actively wants to give permissions. This means we first check if we
   * can ask him for the permissions natively, otherwise we show an alert with a
   * link to the settings.
   */
  public async userRequestsPermissions(permissions: PermissionTypes[]): Promise<void> {
    let canRequestPermission: boolean = false
    for (const p of permissions) {
      canRequestPermission = (await this.canAskForPermission(p)) || canRequestPermission
    }
    if (canRequestPermission) {
      await this.requestPermissions(permissions)
    } else {
      await this.showSettingsAlert()
    }
  }

  public async showSettingsAlert(): Promise<void> {
    await this.showAlert('Settings', 'You can enable the missing permissions in the device settings.')
  }

  private async canAskForPermission(permission: PermissionTypes): Promise<boolean> {
    let canAskForPermission: boolean = true

    if (permission === PermissionTypes.CAMERA) {
      const permissionStatus: PermissionStatus = await this.hasCameraPermission()
      canAskForPermission =
        !(await this.storage.get(WalletStorageKey.CAMERA_PERMISSION_ASKED)) || !(permissionStatus === PermissionStatus.DENIED)
    }

    return canAskForPermission
  }

  private async checkPermission(type: PermissionType): Promise<PermissionStatus> {
    const permission = await this.permissions.query({ name: type })

    return this.getPermissionStatus(permission.state)
  }

  private async getPermissionStatus(permission: 'granted' | 'denied' | 'prompt'): Promise<PermissionStatus> {
    if (permission === 'granted') {
      return PermissionStatus.GRANTED
    } else if (permission === 'denied') {
      return PermissionStatus.DENIED
    } else {
      return PermissionStatus.UNKNOWN
    }
  }

  private async showAlert(title: string, message: string): Promise<void> {
    const alert: HTMLIonAlertElement = await this.alertCtrl.create({
      header: title,
      message,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Open settings',
          handler: (): void => {
            this.diagnostic.switchToSettings().catch(handleErrorSentry(ErrorCategory.CORDOVA_PLUGIN))
          }
        }
      ]
    })
    alert.present().catch(handleErrorSentry(ErrorCategory.IONIC_ALERT))
  }
}
