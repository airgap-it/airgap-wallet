import { AbstractControl } from '@angular/forms'

import { UIInputWidget, UIInputWidgetConfig } from '../UIInputWidget'
import { UIWidgetType } from '../UIWidget'

interface OptionButton {
  value: string
  label: string
}

interface CustomInput {
  id: string
  type: InputType
  defaultValue?: string
  suffix?: string

  formControl?: AbstractControl

  controlValueToValue?: (controlValue: string) => string
}

type InputType = 'text' | 'password' | 'email' | 'number' | 'search' | 'tel' | 'url'

export interface UIOptionButtonGroupConfig extends UIInputWidgetConfig {
  label?: string

  optionButtons: OptionButton[]
  customInput?: CustomInput

  defaultSelected?: string
}

export class UIOptionButtonGroup extends UIInputWidget<string> {
  public type: UIWidgetType = UIWidgetType.OPTION_BUTTON_GROUP

  public readonly label?: string

  public readonly optionButtons: OptionButton[]

  public readonly customInput?: CustomInput

  public readonly defaultSelected?: string

  public readonly onSelected?: (value: string) => void

  public constructor(config: UIOptionButtonGroupConfig) {
    super(config)

    this.label = config.label

    this.optionButtons = config.optionButtons
    this.customInput = config.customInput

    this.defaultSelected = config.defaultSelected

    this.setupAuxFormControl()
  }

  private setupAuxFormControl(): void {
    const formControl: AbstractControl | undefined = this.customInput?.formControl
    if (!formControl) {
      return
    }

    formControl.valueChanges.subscribe((auxValue) => {
      if (auxValue) {
        const value: string = this.customInput?.controlValueToValue ? this.customInput.controlValueToValue(auxValue) : auxValue
        this.formControl?.patchValue(value)
      }
    })
  }
}
