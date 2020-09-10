import { Injectable, Inject } from '@angular/core'
import { ToastController } from '@ionic/angular'

import { CLIPBOARD_PLUGIN } from '@airgap/angular-core'
import { ClipboardPlugin } from '@capacitor/core'
import { ErrorCategory, handleErrorSentry } from '../sentry-error-handler/sentry-error-handler'

@Injectable({
  providedIn: 'root'
})
export class ClipboardService {
  constructor(private readonly toastController: ToastController, @Inject(CLIPBOARD_PLUGIN) private readonly clipboard: ClipboardPlugin) {}

  public async copy(text: string): Promise<void> {
    return this.clipboard.write({
      string: text
    })
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
      const text = await this.clipboard.read()
      return text.value
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
        buttons: [
          {
            text: 'Ok',
            role: 'cancel'
          }
        ]
      })
      .then(toast => {
        toast.present().catch(handleErrorSentry(ErrorCategory.IONIC_TOAST))
      })
  }
}
