import { Injectable } from '@angular/core';
import { Usuario } from '../interfaces/common.interfaces';

export interface Destinatario {
  orden: number;
  usuario: Usuario | null;
  searchTerm: string;
  originalSearchTerm?: string;
}

export interface DestinatarioData {
  usuarioId: string;
  noUsuarioId?: number;
  orden?: number;
}

@Injectable({
  providedIn: 'root'
})
export class RecipientService {

  resolveTypedRecipients(destinatarios: Destinatario[], allUsers: Usuario[]): void {

    destinatarios.forEach((d, index) => {
      if (d.usuario) {
        return;
      }

      const term = (d.searchTerm || '').trim();
      if (!term) {
        return;
      }

      const user = this.findUserBySearchTerm(term, allUsers);

      if (user) {
        d.usuario = user;
        d.searchTerm = `${user.nombres} ${user.apellidos} (${user.usuario})`;
      }
    });
  }

  private findUserBySearchTerm(term: string, allUsers: Usuario[]): Usuario | undefined {
    const match = term.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      const username = match[1].trim();
      const user = allUsers.find(u => u.usuario === username);
      if (user) return user;
    }

    if (/^\d+$/.test(term)) {
      const idNum = parseInt(term, 10);
      const user = allUsers.find(u => u.noUsuario === idNum);
      if (user) return user;
    }

    const t = term.toLowerCase();
    const matches = allUsers.filter(u =>
      (u.nombres + ' ' + u.apellidos).toLowerCase().includes(t) ||
      u.usuario.toLowerCase().includes(t)
    );

    return matches.length === 1 ? matches[0] : undefined;
  }

  filterUsersForDropdown(searchTerm: string, allUsers: Usuario[], selectedUserIds: number[], creatorUserId?: number): Usuario[] {
    if (searchTerm.length <= 1) return [];

    const filtered = allUsers.filter(user => {
      const matchesSearch = user.nombres.toLowerCase().includes(searchTerm) ||
                           user.apellidos.toLowerCase().includes(searchTerm) ||
                           user.usuario.toLowerCase().includes(searchTerm);

      if (!matchesSearch) return false;

      const isCreator = creatorUserId ? user.noUsuario === creatorUserId : false;
      if (isCreator) {
        return false;
      }

      const isSelected = selectedUserIds.includes(user.idUsuario);
      if (isSelected) {
        return false;
      }

      return true;
    });

    return filtered;
  }

  convertDestinatariosToData(destinatarios: Destinatario[], establecerOrden: boolean): DestinatarioData[] {
    return destinatarios
      .filter(d => d.usuario)
      .map(d => ({
        usuarioId: d.usuario!.usuario,
        noUsuarioId: this.getUserId(d.usuario!),
        orden: establecerOrden ? d.orden : undefined
      }));
  }

  extractUserIds(destinatarios: Destinatario[]): number[] {
    return destinatarios
      .filter(d => d.usuario)
      .map(d => this.getUserId(d.usuario!));
  }

  private getUserId(usuario: Usuario): number {
    return (usuario as any).idUsuario || usuario.noUsuario;
  }

  hasValidRecipients(destinatarios: Destinatario[]): boolean {
    return destinatarios.some(d => d.usuario !== null);
  }

  createNewRecipient(orden: number): Destinatario {
    return { orden, usuario: null, searchTerm: '' };
  }

  reorderRecipients(destinatarios: Destinatario[]): void {
    destinatarios.forEach((dest, index) => {
      dest.orden = index + 1;
    });
  }
}
