import { Injectable } from '@angular/core'

@Injectable()
export class ClipboardBrowserProvider {
  async copy(text: string): Promise<void> {
    try {
      await (navigator as any).clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  async paste(): Promise<string> {
    try {
      return (navigator as any).clipboard.readText()
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }
}
