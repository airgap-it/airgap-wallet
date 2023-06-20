import { AirGapAngularCoreModule, isolatedModulesListPageFacade, ISOLATED_MODULES_LIST_PAGE_FACADE } from '@airgap/angular-core'
import { CommonModule } from '@angular/common'
import { Injector, NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { IonicModule } from '@ionic/angular'
import { PushPipe } from '@ngrx/component'
import { TranslateModule } from '@ngx-translate/core'

import { ComponentsModule } from '../../components/components.module'

import { IsolatedModulesListPageRoutingModule } from './isolated-modules-list-routing.module'
import { IsolatedModulesListPage } from './isolated-modules-list.page'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IsolatedModulesListPageRoutingModule,
    TranslateModule,
    PushPipe,
    ComponentsModule,
    AirGapAngularCoreModule
  ],
  declarations: [IsolatedModulesListPage],
  providers: [{ provide: ISOLATED_MODULES_LIST_PAGE_FACADE, useFactory: isolatedModulesListPageFacade, deps: [Injector] }]
})
export class IsolatedModulesListPageModule {}
