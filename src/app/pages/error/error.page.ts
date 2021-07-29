import { ClipboardService } from '@airgap/angular-core'
import { Component, AfterViewInit } from '@angular/core'
import { ModalController } from '@ionic/angular'

@Component({
  selector: 'app-error',
  templateUrl: './error.page.html',
  styleUrls: ['./error.page.scss']
})
export class ErrorPage implements AfterViewInit {
  public title: string | undefined
  public message: string | undefined
  public data: unknown
  public parsedData: string

  constructor(private readonly clipboardService: ClipboardService, private readonly modalController: ModalController) {}

  ngAfterViewInit() {
    this.parsedData = typeof this.data === 'object' ? JSON.stringify(this.data, null, 2) : this.data + ''
  }

  public async dismiss(): Promise<void> {
    await this.modalController.dismiss(true)
  }

  public async copyToClipboard(): Promise<void> {
    this.clipboardService.copyAndShowToast(this.parsedData)
  }
}
