import { Directive, ElementRef, HostListener, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

function formatPhone(digits: string): string {
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

@Directive({
  selector: 'input[phoneMask]',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneMaskDirective),
      multi: true,
    },
  ],
})
export class PhoneMaskDirective implements ControlValueAccessor {
  private readonly elementRef = inject<ElementRef<HTMLInputElement>>(ElementRef);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  @HostListener('input', ['$event'])
  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const cursor = target.selectionStart ?? target.value.length;
    const digits = target.value.replace(/\D/g, '').slice(0, 11);
    const formatted = formatPhone(digits);
    const diff = formatted.length - target.value.length;

    target.value = formatted;
    target.setSelectionRange(
      Math.max(0, Math.min(formatted.length, cursor + diff)),
      Math.max(0, Math.min(formatted.length, cursor + diff)),
    );

    // O FormControl recebe apenas os dígitos (sem máscara) para envio direto à API.
    this.onChange(digits);
  }

  @HostListener('blur')
  protected onBlur(): void {
    this.onTouched();
  }

  writeValue(value: string | null): void {
    this.elementRef.nativeElement.value = formatPhone((value ?? '').replace(/\D/g, '').slice(0, 11));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.elementRef.nativeElement.disabled = isDisabled;
  }
}
