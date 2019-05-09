import { Component, Input } from '@angular/core'

import { ClipboardProvider } from '../../services/clipboard/clipboard'

@Component({
  selector: 'qr-clipboard',
  templateUrl: 'qr-clipboard.html'
})
export class QrClipboardComponent {
  @Input()
  public level: string = 'L'

  @Input()
  public qrdata: any = ''

  @Input()
  public size: number = 300

  constructor(private readonly clipboardProvider: ClipboardProvider) {}

  public async copyToClipboard() {
    await this.clipboardProvider.copyAndShowToast(this.qrdata)
  }
}
