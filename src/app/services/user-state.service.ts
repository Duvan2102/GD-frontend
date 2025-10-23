import { Injectable } from '@angular/core';
import { Usuario } from '../interfaces/common.interfaces';

@Injectable({
  providedIn: 'root'
})
export class UserStateService {
  private _pendingUser: Usuario | null = null;
  private _pendingAction: 'activar' | 'inactivar' | 'eliminarQR' | 'rechazar' | null = null;

  setPendingOperation(user: Usuario, action: 'activar' | 'inactivar' | 'eliminarQR' | 'rechazar'): void {
    this._pendingUser = { ...user };
    this._pendingAction = action;
  }

  getPendingOperation(): { user: Usuario | null, action: string | null } {
    return {
      user: this._pendingUser,
      action: this._pendingAction
    };
  }

  clearPendingOperation(): void {
    this._pendingUser = null;
    this._pendingAction = null;
  }
}