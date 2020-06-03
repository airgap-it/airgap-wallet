import { Component } from '@angular/core'
import { ModalController } from '@ionic/angular'

@Component({
  selector: 'app-error',
  templateUrl: './error.page.html',
  styleUrls: ['./error.page.scss']
})
export class ErrorPage {
  public title: string | undefined
  public message: string | undefined
  public data: unknown

  constructor(private readonly modalController: ModalController) {}

  public async dismiss(): Promise<void> {
    await this.modalController.dismiss(true)
  }
}
