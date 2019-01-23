import { Component } from '@angular/core'
import { NavController, NavParams } from 'ionic-angular'

@Component({
  selector: 'page-add-sub-account',
  templateUrl: 'add-sub-account.html'
})
export class AddSubAccountPage {
  constructor(public navCtrl: NavController, public navParams: NavParams) {}

  ionViewDidLoad() {
    console.log('ionViewDidLoad AddSubAccountPage')
  }
}
