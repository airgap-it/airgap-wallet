import { Injectable } from '@angular/core'
import { Clipboard } from '@ionic-native/clipboard/ngx'
import { Platform, ToastController } from '@ionic/angular'

import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'

@Injectable({
  providedIn: 'root'
})
export class ClipboardProvider {
  constructor(
    private readonly platform: Platform,
    private readonly clipboard: Clipboard,
    private readonly toastController: ToastController
  ) {}

  public async copy(text: string): Promise<void> {
    if (this.platform.is('cordova')) {
      return this.clipboard.copy(text)
    } else {
      return (navigator as any).clipboard.writeText(text)
    }
  }

  public async copyAndShowToast(text: string, toastMessage: string = 'Successfully copied to your clipboard!') {
    try {
      await this.copy(text)
      await this.showToast(toastMessage)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  public async paste(): Promise<string> {
    try {
      if (this.platform.is('cordova')) {
        return this.clipboard.paste()
      } else {
        return (navigator as any).clipboard.readText()
      }
    } catch (err) {
      console.error('Failed to copy: ', err)

      return ''
    }
  }

  private async showToast(message: string) {
    this.toastController
      .create({
        message,
        duration: 1000,
        position: 'top',
        showCloseButton: true,
        closeButtonText: 'Ok'
      })
      .then(toast => {
        toast.present().catch(handleErrorSentry(ErrorCategory.IONIC_TOAST))
      })
  }
}
