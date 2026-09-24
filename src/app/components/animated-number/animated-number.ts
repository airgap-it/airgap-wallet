import { DecimalPipe } from '@angular/common'
import { Component, ElementRef, Input, NgZone, OnChanges, OnDestroy, SimpleChanges } from '@angular/core'

/**
 * Renders a number and eases towards new values instead of jumping. Used for
 * amounts that are updated many times in a row, such as the portfolio total
 * while wallets are still syncing.
 *
 * The tween runs outside Angular's zone and writes straight to the DOM, so the
 * frames do not trigger change detection. The first value is rendered
 * immediately; only later changes are animated.
 */
@Component({
  selector: 'animated-number',
  template: '',
  providers: [DecimalPipe]
})
export class AnimatedNumberComponent implements OnChanges, OnDestroy {
  @Input()
  public value: number = 0

  /** Format string of Angular's `number` pipe. */
  @Input()
  public format: string = '1.2-2'

  @Input()
  public duration: number = 400

  private displayedValue: number | undefined
  private frameHandle: number | undefined

  private readonly reducedMotion: boolean =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  public constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly zone: NgZone,
    private readonly decimalPipe: DecimalPipe
  ) {}

  public ngOnChanges(changes: SimpleChanges): void {
    if (!changes.value && !changes.format) {
      return
    }

    const target: number = Number.isFinite(this.value) ? this.value : 0

    if (this.displayedValue === undefined || this.reducedMotion || this.duration <= 0 || changes.format) {
      this.render(target)
      return
    }

    this.animateTo(target)
  }

  public ngOnDestroy(): void {
    this.cancel()
  }

  private animateTo(target: number): void {
    this.cancel()

    const from: number = this.displayedValue ?? target
    if (from === target) {
      return
    }

    const start: number = performance.now()

    this.zone.runOutsideAngular(() => {
      const step = (now: number): void => {
        const progress: number = Math.min((now - start) / this.duration, 1)
        const eased: number = 1 - Math.pow(1 - progress, 3) // ease-out cubic

        if (progress >= 1) {
          this.frameHandle = undefined
          this.render(target)
          return
        }

        this.render(from + (target - from) * eased)
        this.frameHandle = requestAnimationFrame(step)
      }

      this.frameHandle = requestAnimationFrame(step)
    })
  }

  private render(value: number): void {
    this.displayedValue = value
    const text: string | null = this.decimalPipe.transform(value, this.format)
    if (this.elementRef.nativeElement.textContent !== text) {
      this.elementRef.nativeElement.textContent = text ?? ''
    }
  }

  private cancel(): void {
    if (this.frameHandle !== undefined) {
      cancelAnimationFrame(this.frameHandle)
      this.frameHandle = undefined
    }
  }
}
