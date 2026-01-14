import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export class PasswordValidator {
  /**
   * Valida una contraseña con todos los requisitos
   */
  static validate(password: string, personalData?: {
    nombres?: string;
    apellidos?: string;
    usuario?: string;
    email?: string;
  }): PasswordValidationResult {
    const errors: string[] = [];

    // Validar longitud mínima
    if (!password || password.length < 10) {
      errors.push('La contraseña debe contener mínimo 10 caracteres');
    }

    // Validar letras mayúsculas
    if (!/[A-Z]/.test(password)) {
      errors.push('Debe incluir letras en mayúscula');
    }

    // Validar letras minúsculas
    if (!/[a-z]/.test(password)) {
      errors.push('Debe incluir letras en minúscula');
    }

    // Validar números
    if (!/[0-9]/.test(password)) {
      errors.push('Debe incluir números');
    }

    // Validar caracteres especiales
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Debe incluir signos especiales');
    }

    // Validar que no contenga datos personales
    if (personalData) {
      const passwordLower = password.toLowerCase();
      
      if (personalData.nombres) {
        const nombres = personalData.nombres.toLowerCase().split(' ').filter(n => n.length > 2);
        for (const nombre of nombres) {
          if (passwordLower.includes(nombre)) {
            errors.push('No debe contener datos personales (nombres)');
            break;
          }
        }
      }

      if (personalData.apellidos) {
        const apellidos = personalData.apellidos.toLowerCase().split(' ').filter(a => a.length > 2);
        for (const apellido of apellidos) {
          if (passwordLower.includes(apellido)) {
            errors.push('No debe contener datos personales (apellidos)');
            break;
          }
        }
      }

      if (personalData.usuario) {
        const usuario = personalData.usuario.toLowerCase();
        if (usuario.length > 2 && passwordLower.includes(usuario)) {
          errors.push('No debe contener datos personales (usuario)');
        }
      }

      if (personalData.email) {
        const emailParts = personalData.email.toLowerCase().split('@');
        if (emailParts[0] && emailParts[0].length > 2 && passwordLower.includes(emailParts[0])) {
          errors.push('No debe contener datos personales (email)');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validator(personalData?: {
    nombres?: string;
    apellidos?: string;
    usuario?: string;
    email?: string;
  }): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Dejar que Validators.required maneje esto
      }

      const result = PasswordValidator.validate(control.value, personalData);
      
      if (result.isValid) {
        return null;
      }

      return {
        passwordValidation: {
          errors: result.errors
        }
      };
    };
  }

  static getErrorMessages(errors: string[]): string {
    return errors.join('. ');
  }
}
