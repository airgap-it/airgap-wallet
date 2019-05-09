import * as fs from 'fs'
import { browser, by, element } from 'protractor'

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}

export class AppPage {
  private readonly time = new Date()

  public navigateTo() {
    return browser.get('/')
  }

  public waitForAngular() {
    return browser.waitForAngular()
  }

  public getParagraphText() {
    return element(by.deepCss('app-root ion-content')).getText()
  }

  public sleep(time: number) {
    return browser.sleep(time)
  }

  public takeScreenshot(page: string) {
    return browser
      .takeScreenshot()
      .then(async png => {
        const capabilities = await browser.getCapabilities()
        const config = await browser.getProcessedConfig()

        const platform = config.capabilities.chromeOptions.mobileEmulation
          ? slugify(config.capabilities.chromeOptions.mobileEmulation.deviceName)
          : 'desktop'

        console.log(platform, 'browser.takeScreenshot()')

        const stream = fs.createWriteStream(
          `./screenshots/${platform}/${page}-${this.time.getTime()}-screenshot.png` /* node >10 { recursive: true }*/
        )
        stream.write(Buffer.from(png, 'base64'))
        stream.end()
      })
      .catch(error => console.error('Cannot take screenshot', error))
  }
}
