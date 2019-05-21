// Protractor configuration file, see link for more information
// https://github.com/angular/protractor/blob/master/lib/config.ts

const { SpecReporter } = require('jasmine-spec-reporter')
var HtmlReporter = require('protractor-beautiful-reporter')

function getBaseCapability() {
  return {
    browserName: 'chrome',

    chromeOptions: {
      args: []
    }
  }
}

const desktopCapability = {
  browserName: 'chrome',

  chromeOptions: {
    args: ['--headless', '--disable-gpu', '--window-size=1300,800']
  }
}

const androidCapability = {
  browserName: 'chrome',

  chromeOptions: {
    args: ['--headless', '--disable-gpu'],
    mobileEmulation: {
      deviceName: 'Pixel 2 XL'
    }
  }
}

const iPhoneCapability = {
  browserName: 'chrome',

  chromeOptions: {
    args: ['--headless', '--disable-gpu'],
    mobileEmulation: {
      deviceName: 'iPhone X'
    }
  }
}

makeHeadless(makeiPhone(getBaseCapability()))

function makeiPhone(capability) {
  capability.chromeOptions.mobileEmulation = {
    deviceName: 'iPhone X'
  }
  return capability
}

function makeHeadless(capability) {
  capability.chromeOptions.args.push('--headless', '--disable-gpu')
  return capability
}

const headful = {
  browserName: 'chrome',

  chromeOptions: {
    // args: ['--lang=de-DE'],
    mobileEmulation: {
      deviceName: 'iPhone X'
    },
    prefs: {
      // 'intl.accept_languages': 'zh-CN',
      'profile.content_settings.exceptions.clipboard': {
        'http://localhost:4200,*': { last_modified: Date.now(), setting: 1 }
      }
    }
  }
}

// const multiCapabilities = [makeHeadless(makeiPhone(getBaseCapability()))]
const multiCapabilities = [headful]

const { join } = require('path')

exports.config = {
  allScriptsTimeout: 11000,
  specs: ['./src/**/*.e2e-spec.ts'],
  multiCapabilities,
  directConnect: true,
  baseUrl: 'http://localhost:4200/',
  framework: 'jasmine',
  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 30000,
    print: function() {}
  },
  plugins: [
    {
      // The module name
      package: 'protractor-image-comparison',
      // Some options, see the docs for more
      options: {
        baselineFolder: join(process.cwd(), './baseline/'),
        formatImageName: `{tag}-{logName}-{width}x{height}`,
        screenshotPath: join(process.cwd(), '.tmp/'),
        savePerInstance: true
        // autoSaveBaseline: true
        // ... more options
      }
    }
  ],
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
