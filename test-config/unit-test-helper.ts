import { CommonModule } from '@angular/common'
import { TestModuleMetadata } from '@angular/core/testing'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { RouterTestingModule } from '@angular/router/testing'
import { IonicModule, NavController, Platform, ToastController } from '@ionic/angular'
import { IonicStorageModule, Storage } from '@ionic/storage'
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core'
import { MomentModule } from 'ngx-moment'

import { PipesModule } from '../src/app/pipes/pipes.module'

import { ToastControllerMock } from './mocks-ionic'
import { StorageMock } from './storage-mock'

export class UnitHelper {
  public static testBed(testBed: TestModuleMetadata, useIonicOnlyTestBed = false): TestModuleMetadata {
    const mandatoryDeclarations: any[] = []
    const mandatoryImports: any[] = [
      CommonModule,
      ReactiveFormsModule,
      IonicModule,
      FormsModule,
      RouterTestingModule,
      IonicStorageModule.forRoot({
        name: '__test_airgap_storage',
        driverOrder: ['localstorage']
      }),
      MomentModule,
      TranslateModule.forRoot({
        loader: { provide: TranslateLoader, useClass: TranslateFakeLoader }
      })
    ]
    const mandatoryProviders: any[] = [NavController, Platform, { provide: ToastController, useClass: ToastControllerMock }]

    if (!useIonicOnlyTestBed) {
      mandatoryProviders.push({ provide: Storage, useClass: StorageMock })
      mandatoryDeclarations.push()
      mandatoryImports.push(PipesModule)
    }

    testBed.declarations = [...(testBed.declarations || []), ...mandatoryDeclarations]
    testBed.imports = [...(testBed.imports || []), ...mandatoryImports]
    testBed.providers = [...(testBed.providers || []), ...mandatoryProviders]

    return testBed
  }
}
