// This file is required by karma.conf.js and loads recursively all the .spec and framework files

/* eslint-disable import/order */
import 'zone.js/testing' // Zone import has to be at the top or else it won't compile
import { getTestBed } from '@angular/core/testing'
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing'

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting(), {
  teardown: { destroyAfterEach: false }
})
