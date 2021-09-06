import { BehaviorSubject } from 'rxjs'

export enum UIWidgetType {
  ACCOUNT = 'account',
  ACCOUNT_SUMMARY = 'account_summary',
  ACCOUNT_EXTENDED_DETAILS = 'account_extended_details',
  ALERT = 'alert',
  ICON_TEXT = 'icon_text',
  INPUT_TEXT = 'input_text',
  REWARD_LIST = 'reward_list',
  OPTION_BUTTON_GROUP = 'option_button_group'
}

export enum WidgetState {
  UNKNOWN = 0,
  INIT,
  CONTENT_INIT,
  VIEW_INIT
}

export interface UIWidgetConfig {
  id?: string
  isVisible?: boolean
}

export abstract class UIWidget {
  public abstract readonly type: UIWidgetType

  public readonly id?: string
  public isVisible: boolean

  protected get state(): WidgetState {
    const state = this.state$.value
    return state in WidgetState ? state : WidgetState.UNKNOWN
  }

  protected set state(value: WidgetState) {
    this.state$.next(value)
  }

  protected scheduledActions: Map<WidgetState, Function[]> = new Map()

  private readonly state$: BehaviorSubject<number> = new BehaviorSubject(WidgetState.UNKNOWN)

  constructor(config: UIWidgetConfig) {
    this.id = config.id
    this.isVisible = config.isVisible !== undefined ? config.isVisible : true

    this.initObservers()
  }

  public onInit(): void {
    this.state = WidgetState.INIT
  }

  public afterContentInit(): void {
    this.state = WidgetState.CONTENT_INIT
  }

  public afterViewInit(): void {
    this.state = WidgetState.VIEW_INIT
  }

  public reachedState(state: WidgetState): boolean {
    return this.state >= state
  }

  public doAfterReached(state: WidgetState, action: () => void, async: boolean = false) {
    if (this.reachedState(state)) {
      !async ? action() : setTimeout(action)
    } else {
      const toSchedule = !async
        ? action
        : () => {
            setTimeout(action)
          }
      this.scheduleAction(state, toSchedule)
    }
  }

  public scheduleAction(state: WidgetState, action: () => void) {
    const actions = this.scheduledActions.get(state) || []
    actions.push(action)

    this.scheduledActions.set(state, actions)
  }

  protected invokeScheduled(state: WidgetState) {
    if (this.scheduledActions.has(state)) {
      const actions = this.scheduledActions.get(state)
      this.scheduledActions.delete(state)

      actions.forEach((action) => action())
    }
  }

  private initObservers() {
    this.state$.subscribe((state) => {
      this.invokeScheduled(state)
    })
  }
}
