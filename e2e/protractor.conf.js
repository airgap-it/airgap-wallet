// Protractor configuration file, see link for more information
// https://github.com/angular/protractor/blob/master/lib/config.ts

const { SpecReporter } = require('jasmine-spec-reporter')
var HtmlReporter = require('protractor-beautiful-reporter')

exports.config = {
  allScriptsTimeout: 11000,
  specs: ['./src/**/*.e2e-spec.ts'],
  multiCapabilities: [
    {
      browserName: 'chrome',

      chromeOptions: {
        args: ['--headless', '--disable-gpu', '--window-size=1300,800']
      }
    },
    {
      browserName: 'chrome',

      chromeOptions: {
        args: ['--headless', '--disable-gpu'],
        mobileEmulation: {
          deviceName: 'Pixel 2 XL'
        }
      }
    },
    {
      browserName: 'chrome',

      chromeOptions: {
        args: ['--headless', '--disable-gpu' /*, 'lang=de-DE' */],
        mobileEmulation: {
          deviceName: 'iPhone X'
        }
      }
    }
  ],
  directConnect: true,
  baseUrl: 'http://localhost:4200/',
  framework: 'jasmine',
  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 30000,
    print: function() {}
  },
  onPrepare() {
    require('ts-node').register({
      project: require('path').join(__dirname, './tsconfig.e2e.json')
    })
    jasmine.getEnv().addReporter(new SpecReporter({ spec: { displayStacktrace: true } }))
    jasmine.getEnv().addReporter(
      new HtmlReporter({
        baseDirectory: 'reports/e2e/'
      }).getJasmine2Reporter()
    )
  }
}
