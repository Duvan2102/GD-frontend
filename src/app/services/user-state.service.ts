import { Injectable } from '@angular/core';
import { Usuario } from '../interfaces/common.interfaces';

@Injectable({
  providedIn: 'root'
})
export class UserStateService {
  private _pendingUser: Usuario | null = null;
  private _pendingAction: 'activar' | 'inactivar' | 'eliminarQR' | null = null;

  setPendingOperation(user: Usuario, action: 'activar' | 'inactivar' | 'eliminarQR') {
    this._pendingUser = { ...user }; // Copiar para evitar mutaciones
    this._pendingAction = action;
    console.log('DEBUG: UserStateService.setPendingOperation', { user, action });
  }

  getPendingOperation(): { user: Usuario | null, action: string | null } {
    console.log('DEBUG: UserStateService.getPendingOperation', { 
      user: this._pendingUser, 
      action: this._pendingAction 
    });
    return {
      user: this._pendingUser,
      action: this._pendingAction
    };
  }

  clearPendingOperation() {
    console.log('DEBUG: UserStateService.clearPendingOperation');
    this._pendingUser = null;
    this._pendingAction = null;
  }
}