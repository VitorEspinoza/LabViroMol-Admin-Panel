import { AbstractControl, ValidationErrors } from '@angular/forms';

export function differentFromUserPhone(control: AbstractControl): ValidationErrors | null {
  const phone = (control.get('phoneNumber')?.value ?? '') as string;
  const emergency = (control.get('emergencyContactNumber')?.value ?? '') as string;
  const phoneDigits = phone.replace(/\D/g, '');
  const emergencyDigits = emergency.replace(/\D/g, '');
  if (phoneDigits && emergencyDigits && phoneDigits === emergencyDigits) {
    return { samePhone: true };
  }
  return null;
}
