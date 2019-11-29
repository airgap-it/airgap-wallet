import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterModule, Routes } from '@angular/router'
import { IonicModule } from '@ionic/angular'
import { TranslateModule } from '@ngx-translate/core'

import { ComponentsModule } from '../../components/components.module'

import { PipesModule } from './../../pipes/pipes.module'
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
