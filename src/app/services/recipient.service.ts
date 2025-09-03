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

  /**
   * Resuelve destinatarios basándose en términos de búsqueda
   */
  resolveTypedRecipients(destinatarios: Destinatario[], allUsers: Usuario[]): void {
    console.log('[RecipientService] Resolviendo destinatarios...', destinatarios);
    console.log('[RecipientService] Usuarios disponibles:', allUsers);
    
    destinatarios.forEach((d, index) => {
      if (d.usuario) {
        console.log(`[RecipientService] Destinatario ${index} ya tiene usuario:`, d.usuario);
        return;
      }
      
      const term = (d.searchTerm || '').trim();
      if (!term) {
        console.log(`[RecipientService] Destinatario ${index} sin término de búsqueda`);
        return;
      }
      
      console.log(`[RecipientService] Buscando usuario para término: "${term}"`);
      
      const user = this.findUserBySearchTerm(term, allUsers);
      
      if (user) {
        console.log(`[RecipientService] Usuario encontrado para destinatario ${index}:`, user);
        d.usuario = user;
        d.searchTerm = `${user.nombres} ${user.apellidos} (${user.usuario})`;
      }
    });
  }

  /**
   * Busca un usuario basándose en un término de búsqueda
   */
  private findUserBySearchTerm(term: string, allUsers: Usuario[]): Usuario | undefined {
    // Buscar por username entre paréntesis
    const match = term.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      const username = match[1].trim();
      const user = allUsers.find(u => u.usuario === username);
      console.log(`[RecipientService] Búsqueda por username "${username}":`, user);
      if (user) return user;
    }
    
    // Buscar por ID numérico
    if (/^\d+$/.test(term)) {
      const idNum = parseInt(term, 10);
      const user = allUsers.find(u => u.noUsuario === idNum);
      console.log(`[RecipientService] Búsqueda por ID ${idNum}:`, user);
      if (user) return user;
    }
    
    // Buscar por texto en nombres o usuario
    const t = term.toLowerCase();
    const matches = allUsers.filter(u =>
      (u.nombres + ' ' + u.apellidos).toLowerCase().includes(t) ||
      u.usuario.toLowerCase().includes(t)
    );
    console.log(`[RecipientService] Búsqueda por texto "${t}":`, matches);
    
    return matches.length === 1 ? matches[0] : undefined;
  }

  /**
   * Filtra usuarios para mostrar en dropdown
   */
  filterUsersForDropdown(searchTerm: string, allUsers: Usuario[], selectedUserIds: number[], creatorUserId?: number): Usuario[] {
    if (searchTerm.length <= 1) return [];
    
    console.log('[RecipientService] Filtrando usuarios:', {
      searchTerm,
      allUsersCount: allUsers.length,
      selectedUserIds,
      creatorUserId
    });
    
    const filtered = allUsers.filter(user => {
      // Verificar si el usuario coincide con la búsqueda
      const matchesSearch = user.nombres.toLowerCase().includes(searchTerm) ||
                           user.apellidos.toLowerCase().includes(searchTerm) ||
                           user.usuario.toLowerCase().includes(searchTerm);
      
      if (!matchesSearch) return false;
      
      // Verificar si es el usuario creador
      const isCreator = creatorUserId ? user.noUsuario === creatorUserId : false;
      if (isCreator) {
        console.log(`[RecipientService] EXCLUYENDO usuario creador: ${user.usuario} (${user.noUsuario})`);
        return false;
      }
      
      // Verificar si ya está seleccionado
      const isSelected = selectedUserIds.includes(user.noUsuario);
      if (isSelected) {
        console.log(`[RecipientService] EXCLUYENDO usuario ya seleccionado: ${user.usuario} (${user.noUsuario})`);
        return false;
      }
      
      console.log(`[RecipientService] INCLUYENDO usuario: ${user.usuario} (${user.noUsuario})`);
      return true;
    });
    
    console.log('[RecipientService] Usuarios filtrados finales:', filtered.map(u => `${u.usuario} (${u.noUsuario})`));
    
    return filtered;
  }

  /**
   * Convierte destinatarios a formato de datos para envío
   */
  convertDestinatariosToData(destinatarios: Destinatario[], establecerOrden: boolean): DestinatarioData[] {
    return destinatarios
      .filter(d => d.usuario)
      .map(d => ({
        usuarioId: d.usuario!.usuario,
        noUsuarioId: this.getUserId(d.usuario!),
        orden: establecerOrden ? d.orden : undefined
      }));
  }

  /**
   * Extrae IDs de usuarios de destinatarios
   */
  extractUserIds(destinatarios: Destinatario[]): number[] {
    return destinatarios
      .filter(d => d.usuario)
      .map(d => this.getUserId(d.usuario!));
  }

  /**
   * Obtiene el ID del usuario de manera segura
   */
  private getUserId(usuario: Usuario): number {
    return (usuario as any).idUsuario || usuario.noUsuario;
  }

  /**
   * Valida que hay al menos un destinatario válido
   */
  hasValidRecipients(destinatarios: Destinatario[]): boolean {
    return destinatarios.some(d => d.usuario !== null);
  }

  /**
   * Crea un nuevo destinatario
   */
  createNewRecipient(orden: number): Destinatario {
    return { orden, usuario: null, searchTerm: '' };
  }

  /**
   * Reordena destinatarios
   */
  reorderRecipients(destinatarios: Destinatario[]): void {
    destinatarios.forEach((dest, index) => { 
      dest.orden = index + 1; 
    });
  }
}
