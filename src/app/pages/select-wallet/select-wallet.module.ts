import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import { IonicModule } from '@ionic/angular'
import { TranslateModule } from '@ngx-translate/core'
import { ZXingScannerModule } from '@zxing/ngx-scanner'

import { ComponentsModule } from '../../components/components.module'

import { SelectWalletPage } from './select-wallet'

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    TranslateModule,
    ComponentsModule,
    ZXingScannerModule,
    RouterModule.forChild([{ path: '', component: SelectWalletPage }])
  ],
  declarations: [SelectWalletPage]
})
export class SelectWalletPageModule {}
