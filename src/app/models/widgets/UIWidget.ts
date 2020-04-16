import { FormGroup } from '@angular/forms'
import { isArray } from 'util'

export enum UIWidgetType {
  ACCOUNT = 'account',
  CHECKBOX = 'checkbox',
  ICON_TEXT = 'icon_text',
  INPUT_TEXT = 'input_text',
  REWARD_LIST = 'reward_list',
  SELECT = 'select'
}

export interface UIWidgetConfig {
  id?: string
  isVisible?: boolean

  connectedForms?: FormGroup | FormGroup[]
  onConnectedFormChanged?: (value?: any, widget?: any) => void
}

export abstract class UIWidget {
  public abstract readonly type: UIWidgetType

  public readonly id?: string
  public isVisible: boolean

  public connectedForms?: FormGroup[]
  public onConnectedFormChangedCallback?: (value?: any, widget?: UIWidget) => void

  constructor(config: UIWidgetConfig) {
    this.id = config.id
    this.isVisible = config.isVisible !== undefined ? config.isVisible : true
    this.onConnectedFormChangedCallback = config.onConnectedFormChanged

    this.setConnectedForms(config.connectedForms)
  }

  public setConnectedForms(connectedForms?: FormGroup | FormGroup[]) {
    if (!connectedForms) {
      return
    }

    this.connectedForms = isArray(connectedForms) ? connectedForms : [connectedForms]

    this.connectedForms.forEach(form => {
      form.valueChanges.subscribe(value => {
        if (value) {
          this.onConnectedFormChanged(value)
        }
      })
      this.onConnectedFormChanged(form.value)
    })
  }

  protected onConnectedFormChanged(value: any) {
    if (this.onConnectedFormChangedCallback) {
      this.onConnectedFormChangedCallback(value, this)
    }
  }
}
