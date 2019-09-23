import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { Routes, RouterModule } from '@angular/router'
import { TranslateModule } from '@ngx-translate/core'
import { ComponentsModule } from '../../components/components.module'

import { IonicModule } from '@ionic/angular'

import { DelegationCosmosPage } from './delegation-cosmos.page'

const routes: Routes = [
  {
    path: '',
    component: DelegationCosmosPage
  }
]

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule, ComponentsModule, RouterModule.forChild(routes)],
  declarations: [DelegationCosmosPage]
})
export class DelegationCosmosPageModule {}
