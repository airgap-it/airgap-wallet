import { Component, Input, OnDestroy } from '@angular/core'
import { SerializerService } from 'src/app/services/serializer/serializer.service'
import { serializedDataToUrlString } from 'src/app/utils/utils'

import { ClipboardService } from '../../services/clipboard/clipboard'

@Component({
  selector: 'qr-clipboard',
  templateUrl: 'qr-clipboard.html'
})
export class QrClipboardComponent implements OnDestroy {
  @Input()
  public level: string = 'L'

  public qrdataArray: string[] = ['']

  @Input()
  set qrdata(value: string | string[]) {
    const array: string[] = Array.isArray(value) ? value : [value]
    this.qrdataArray = array.length === 1 ? [serializedDataToUrlString(array)] : array
  }

  @Input()
  public size: number = 300

  public activeChunk: number = 0

  private readonly timeout: NodeJS.Timeout
  constructor(private readonly clipboardService: ClipboardService, private readonly serializerService: SerializerService) {
    this.timeout = setInterval(() => {
      this.activeChunk = ++this.activeChunk % this.qrdataArray.length
    }, this.serializerService.displayTimePerChunk)
  }

  public async copyToClipboard(): Promise<void> {
    await this.clipboardService.copyAndShowToast(this.qrdataArray.join(','))
  }

  public ngOnDestroy(): void {
    if (this.timeout) {
      clearInterval(this.timeout)
    }
  }
}
