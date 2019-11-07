import { PipesModule } from './../../pipes/pipes.module'
import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Routes, RouterModule } from '@angular/router'
import { TranslateModule } from '@ngx-translate/core'
import { ComponentsModule } from '../../components/components.module'

import { IonicModule } from '@ionic/angular'

import { DelegationValidatorListPage } from './delegation-validator-list.page'

const routes: Routes = [
  {
    path: '',
    component: DelegationValidatorListPage
  }
]

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule, ComponentsModule, PipesModule, RouterModule.forChild(routes)],
  declarations: [DelegationValidatorListPage]
})
export class DelegationValidatorListPageModule {}
