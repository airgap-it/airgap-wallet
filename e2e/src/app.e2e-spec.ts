import { by, element } from 'protractor'

import { AppPage } from './app.po'

describe('new App', () => {
  let page: AppPage

  beforeEach(() => {
    page = new AppPage()
  })

  it('should be blank', async () => {
    await page.navigateTo()
    const text = await page.getParagraphText()

    // await page.takeScreenshot('introduction')

    await expect(text).toContain(
      'Start by adding coins to AirGap Wallet, you will also need the AirGap Vault application where your secret is securely stored.'
    )

    const button = element(by.css('#dismiss-button'))
    await button.click()
    await page.waitForAngular()
    await page.takeScreenshot('portfolio')

    const button2 = element(by.css('#add-initial-coin-button'))
    await button2.click()
    await page.waitForAngular()
    await page.takeScreenshot('add-coin')

    // const button2 = element(by.css('#tab-button-settings'))
    // await button2.click()
    // await page.waitForAngular()
    /*
    var clip = element(by.css('input'))
    clip.sendKeys(
      'airgap-wallet://?d=2WL6PduhrkEyrupvv5ngkmqo6UokfiUissAQU7DqWc92cYU6MoRicB5Vn92LmRTvSR4SfjQ1VsQBs9yFzTs3vTtmsqeNVxj9M2w2yzvhaTcc8fRRYy2YUvKGsBrFpUmnDzSiYLMvYHwBJ8jB7NFW6h6Gou1z8Ab7MapPP2HfRXU2UKryaYDQjtEqSnZvF9zmzs92Z7fm65PbskfbPnVVydvXyB6iWQMnz5FWQpUqjwUWnKkGCo7CxAUHZDeFGQpzzbtoE1RaAiT4uqDoTvuGmqtwozmZtVjJQ741Cx2WY1wVSFpKnfcfdt9QeHmqQhUZhgcR5C8d3PVcSac5iQpRZ8NG3GJu5fZj721fCsxhWDfaqYUSNtPHFjvUKqsqwrobecZ1zyUtwbmMnauZXNYnyFRSC8VcfTbUbUakFSgXqLjbX7gryonCg6Ampg'
    )*/
    /*
    const button3 = element(by.css('#paste-clipboard'))
    await button3.click()
    await page.waitForAngular()
    await page.takeScreenshot('test')
    await page.sleep(1000)*/
    /*
    const button4 = element(by.css('#tab-button-exchange'))
    await button4.click()
    await page.waitForAngular()

    await page.takeScreenshot('test')
    */
    /*
    const button5 = element(by.css('#tab-button-scan'))
    await button5.click()
    await page.waitForAngular()

    await page.takeScreenshot('test')*/
  })
})
