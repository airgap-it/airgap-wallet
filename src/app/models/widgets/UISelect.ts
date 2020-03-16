import { UIWidget, UIWidgetType } from './UIWidget'

export class UISelect extends UIWidget {
  readonly type = UIWidgetType.SELECT

  constructor(readonly id: string, readonly label: string, readonly availableValues: string[], readonly defaultValue?: string) {
    super()
  }
}
