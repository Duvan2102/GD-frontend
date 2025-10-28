import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador personalizado para números de teléfono/celular
 * Valida que el número tenga exactamente 10 dígitos después de limpiar caracteres especiales
 */
export function phoneExactLengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Si está vacío, dejamos que 'required' lo maneje
    }

    const cleaned = control.value.toString().replace(/\D/g, '');
    
    if (cleaned.length !== 10) {
      return { phoneLength: { value: control.value, requiredLength: 10, actualLength: cleaned.length } };
    }

    return null;
  };
}

/**
 * Validador que previene que todos los dígitos sean iguales
 * Ejemplo: 1111111111 no es válido
 */
export function phoneNotAllSameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const cleaned = control.value.toString().replace(/\D/g, '');
    
    // Verificar si todos los dígitos son iguales
    if (/^(\d)\1+$/.test(cleaned)) {
      return { phoneAllSame: { value: control.value } };
    }

    return null;
  };
}

/**
 * Validador que previene más de 3 dígitos consecutivos iguales
 * Ejemplo: 1234444567 no es válido (tiene 4 "4" consecutivos)
 * Ejemplo: 1234445678 es válido (tiene 3 "4" consecutivos)
 */
export function phoneMaxConsecutiveValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const cleaned = control.value.toString().replace(/\D/g, '');
    
    // Verificar si hay más de 3 dígitos consecutivos iguales
    if (/(\d)\1{3,}/.test(cleaned)) {
      return { phoneConsecutive: { value: control.value } };
    }

    return null;
  };
}

/**
 * Validador combinado para teléfonos
 * Aplica todas las validaciones de una vez
 */
export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const cleaned = control.value.toString().replace(/\D/g, '');

    // Validar que solo contenga dígitos (después de limpiar)
    if (!/^\d+$/.test(cleaned)) {
      return { phoneInvalid: { value: control.value } };
    }

    // Validar longitud exacta de 10 dígitos
    if (cleaned.length !== 10) {
      return { phoneLength: { value: control.value, requiredLength: 10, actualLength: cleaned.length } };
    }

    // Validar que no todos los dígitos sean iguales
    if (/^(\d)\1+$/.test(cleaned)) {
      return { phoneAllSame: { value: control.value } };
    }

    // Validar que no haya más de 3 dígitos consecutivos iguales
    if (/(\d)\1{3,}/.test(cleaned)) {
      return { phoneConsecutive: { value: control.value } };
    }

    return null;
  };
}

