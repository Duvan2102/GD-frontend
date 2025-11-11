import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function phoneExactLengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const cleaned = control.value.toString().replace(/\D/g, '');
    
    if (cleaned.length !== 10) {
      return { phoneLength: { value: control.value, requiredLength: 10, actualLength: cleaned.length } };
    }

    return null;
  };
}

export function phoneNotAllSameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const cleaned = control.value.toString().replace(/\D/g, '');
    
    if (/^(\d)\1+$/.test(cleaned)) {
      return { phoneAllSame: { value: control.value } };
    }

    return null;
  };
}

export function phoneMaxConsecutiveValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const cleaned = control.value.toString().replace(/\D/g, '');
    
    if (/(\d)\1{5,}/.test(cleaned)) {
      return { phoneConsecutive: { value: control.value } };
    }

    return null;
  };
}

export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const cleaned = control.value.toString().replace(/\D/g, '');

    if (!/^\d+$/.test(cleaned)) {
      return { phoneInvalid: { value: control.value } };
    }

    if (cleaned.length !== 10) {
      return { phoneLength: { value: control.value, requiredLength: 10, actualLength: cleaned.length } };
    }

    if (/^(\d)\1+$/.test(cleaned)) {
      return { phoneAllSame: { value: control.value } };
    }

    if (/(\d)\1{5,}/.test(cleaned)) {
      return { phoneConsecutive: { value: control.value } };
    }

    return null;
  };
}

