import { Component, Output, EventEmitter, OnInit, ChangeDetectorRef, Input, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TypologyService, Typology } from '../../../services/typology.service';
import { UserService } from '../../../services/user.service';
import { Usuario } from '../../../interfaces/common.interfaces';
import { DocumentView, DocumentViewData } from '../document-view/document-view';
import { ConfirmModal } from '../../users/confirm-modal/confirm-modal';

interface Destinatario {
  orden: number;
  usuario: Usuario | null;
  searchTerm: string;
  originalSearchTerm?: string;
}

export interface SolicitudData {
  nombreSolicitud: string;
  detallesAdicionales: string;
  prioridad: 'NORMAL' | 'IMPORTANTE';
  tipologia: string;
  enviarRecordatorio: 'NUNCA' | 'SEMANALMENTE' | 'CADA_3_DIAS' | 'TODOS_LOS_DIAS';
  documentosAnexos: boolean;
  establecerOrden: boolean;
  destinatarios: Array<{ usuarioId: string; noUsuarioId?: number; orden?: number }>;
  documentoAprobacion?: File;
  anexos?: File[];
}

@Component({
  selector: 'app-create-form',
  standalone: true,
  imports: [CommonModule, FormsModule, DocumentView, ConfirmModal],
  templateUrl: './create-form.html',
  styleUrls: ['./create-form.css']
})
export class CreateForm implements OnInit {
  @ViewChild('docView') docView!: DocumentView;
  @Input() isVisible: boolean = false;
  @Output() onSaved = new EventEmitter<SolicitudData>();
  @Output() close = new EventEmitter<void>();
  @Output() deleteRequest = new EventEmitter<string | number>();

  nombreSolicitud: string = '';
  detallesAdicionales: string = '';
  prioridad: 'NORMAL' | 'IMPORTANTE' = 'NORMAL';
  tipologia: string = '';
  enviarRecordatorio: 'NUNCA' | 'SEMANALMENTE' | 'CADA_3_DIAS' | 'TODOS_LOS_DIAS' = 'NUNCA';
  documentosAnexos: boolean = false;
  establecerOrden: boolean = false;
  documentoAprobacion: File | null = null;
  anexos: File[] = [];
  destinatarios: Destinatario[] = [{ orden: 1, usuario: null, searchTerm: '' }];
  tipologias: Typology[] = [];
  successMessage = '';
  errorMessage = '';
  allUsers: Usuario[] = [];
  filteredUsers: Usuario[] = [];
  activeRecipientIndex: number | null = null;
  showDocumentView: boolean = false;
  documentViewData: DocumentViewData | null = null;
  confirmVisible: boolean = false;
  confirmMessage: string = '¿Confirmas el envío de la solicitud para aprobación?';
  highlightedUserIndex: number = -1;
  dropdownStyle: any = {};

  constructor(
    private typologyService: TypologyService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onResizeOrScroll() {
    if (this.activeRecipientIndex !== null) {
      this.closeDropdown();
    }
  }

  ngOnInit(): void {
    this.loadTypologies();
    this.loadUsers();
  }

  loadTypologies(): void {
    this.typologyService.getAll().subscribe({
      next: (data) => { this.tipologias = data; },
      error: (error) => { this.errorMessage = 'Error al cargar las tipologías.'; }
    });
  }

  loadUsers(): void {
    this.userService.obtenerUsuarios().subscribe({
      next: (data) => { this.allUsers = data; },
      error: (error) => { this.errorMessage = 'Error al cargar los usuarios.'; }
    });
  }

  onSearchUser(event: Event, index: number, inputElement: HTMLInputElement): void {
    const searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    this.destinatarios[index].searchTerm = searchTerm;
    this.destinatarios[index].originalSearchTerm = searchTerm;
    this.activeRecipientIndex = index;
    this.highlightedUserIndex = -1;

    const selectedUserIds = this.destinatarios.map(d => d.usuario?.noUsuario).filter(id => id != null);

    if (searchTerm.length > 1) {
      this.filteredUsers = this.allUsers.filter(user =>
        !selectedUserIds.includes(user.noUsuario) &&
        (user.nombres.toLowerCase().includes(searchTerm) ||
         user.apellidos.toLowerCase().includes(searchTerm) ||
         user.usuario.toLowerCase().includes(searchTerm))
      );
    } else {
      this.filteredUsers = [];
    }

    if (this.filteredUsers.length > 0) {
      this.calculateDropdownPosition(inputElement);
    }
  }

  calculateDropdownPosition(inputElement: HTMLInputElement) {
    const rect = inputElement.getBoundingClientRect();
    const dropdownHeight = 200;
    
    this.dropdownStyle = {
      position: 'fixed',
      bottom: `${window.innerHeight - rect.top + 5}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      top: 'auto',
    };
  }

  onSearchUserKeydown(event: KeyboardEvent, index: number): void {
    if (this.filteredUsers.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedUserIndex = (this.highlightedUserIndex + 1) % this.filteredUsers.length;
      this.updateSearchTermWithHighlightedUser(index);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedUserIndex = (this.highlightedUserIndex - 1 + this.filteredUsers.length) % this.filteredUsers.length;
      this.updateSearchTermWithHighlightedUser(index);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.highlightedUserIndex > -1) {
        this.selectUser(this.filteredUsers[this.highlightedUserIndex], index);
      }
    } else if (event.key === 'Escape') {
      this.closeDropdown();
    }
  }

  private updateSearchTermWithHighlightedUser(index: number): void {
    if (this.highlightedUserIndex > -1) {
      const highlightedUser = this.filteredUsers[this.highlightedUserIndex];
      this.destinatarios[index].searchTerm = `${highlightedUser.nombres} ${highlightedUser.apellidos} (${highlightedUser.usuario})`;
    }
  }

  closeDropdown(): void {
    if (this.activeRecipientIndex !== null) {
        const recipient = this.destinatarios[this.activeRecipientIndex];
        if (recipient && !recipient.usuario) {
            recipient.searchTerm = recipient.originalSearchTerm || '';
        }
    }
    this.activeRecipientIndex = null;
    this.filteredUsers = [];
    this.highlightedUserIndex = -1;
  }

  selectUser(user: Usuario, index: number): void {
    this.destinatarios[index].usuario = user;
    this.destinatarios[index].searchTerm = `${user.nombres} ${user.apellidos} (${user.usuario})`;
    this.closeDropdown();
  }
  
  onDocumentoAprobacionChange(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.documentoAprobacion = file;
    } else {
      alert('Formato de archivo no válido. Solo se permite formato PDF');
      event.target.value = '';
    }
  }

  onAnexosChange(event: any): void {
    const files = event.target.files;
    for (let file of files) {
      if (this.isValidFileType(file)) {
        this.anexos.push(file);
      } else {
        alert('Uno o más archivos tienen un formato no válido. Solo se permiten PDF y Word.');
      }
    }
  }
  
  private isValidFileType(file: File): boolean {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    return allowedTypes.includes(file.type);
  }

  removeAnexo(index: number): void { this.anexos.splice(index, 1); }
  removeDocumentoAprobacion(): void { this.documentoAprobacion = null; }

  agregarDestinatario(): void {
    const nuevoOrden = this.destinatarios.length + 1;
    this.destinatarios.push({ orden: nuevoOrden, usuario: null, searchTerm: '' });
  }

  eliminarDestinatario(index: number): void {
    if (this.destinatarios.length > 1) {
      this.destinatarios.splice(index, 1);
      this.reordenarDestinatarios();
    } else {
      this.destinatarios[0] = { orden: 1, usuario: null, searchTerm: '' };
    }
  }

  private reordenarDestinatarios(): void {
    this.destinatarios.forEach((dest, index) => { dest.orden = index + 1; });
  }

  onEstablecerOrdenChange(): void {
    this.reordenarDestinatarios();
  }

  onPreviewClick(): void {
    if (!this.documentoAprobacion) {
      alert('Debe cargar un documento de aprobación para previsualizar.');
      return;
    }
    this.documentViewData = {
      id: `temp-${Date.now()}`,
      file: this.documentoAprobacion,
      title: this.nombreSolicitud || 'Documento de Aprobación',
    };
    this.showDocumentView = true;
  }

  onCloseView(): void { this.showDocumentView = false; }
  onEditFromView(): void { this.showDocumentView = false; }
  onSendFromView(): void {
    this.confirmVisible = true;
  }

  onConfirmSend(): void {
    this.confirmVisible = false;
    this.onGuardar();
  }

  onCancelConfirm(): void {
    this.confirmVisible = false;
  }

  onDeleteFromView(solicitudId: string | number): void {
    this.deleteRequest.emit(solicitudId);
    this.onCloseView();
  }

  onCancelar(): void {
    this.close.emit();
    this.resetForm();
  }

  onGuardar(): void {
    this.resolveTypedRecipients();
    if (!this.isFormValid()) {
      alert('Por favor completa todos los campos obligatorios, incluyendo al menos un destinatario válido.');
      return;
    }
    const destinatariosIds: number[] = this.destinatarios
        .filter(d => d.usuario)
        .map(d => d.usuario!.noUsuario);

    const solicitudData: SolicitudData = {
      nombreSolicitud: this.nombreSolicitud,
      detallesAdicionales: this.detallesAdicionales,
      prioridad: this.prioridad,
      tipologia: this.tipologia,
      enviarRecordatorio: this.enviarRecordatorio,
      documentosAnexos: this.documentosAnexos,
      establecerOrden: this.establecerOrden,
      destinatarios: this.destinatarios
          .filter(d => d.usuario)
          .map(d => ({
              usuarioId: d.usuario!.usuario,
              noUsuarioId: d.usuario!.noUsuario,
              orden: this.establecerOrden ? d.orden : undefined
          })),
      documentoAprobacion: this.documentoAprobacion || undefined,
      anexos: this.anexos.length > 0 ? this.anexos : undefined,
    };
    this.onSaved.emit(solicitudData);
    this.resetForm();
  }

  isFormValid(): boolean {
    return !!(this.nombreSolicitud.trim() && this.tipologia && this.destinatarios.some(d => d.usuario !== null));
  }

  resetForm(): void {
    this.nombreSolicitud = '';
    this.detallesAdicionales = '';
    this.prioridad = 'NORMAL';
    this.tipologia = '';
    this.enviarRecordatorio = 'NUNCA';
    this.documentosAnexos = false;
    this.establecerOrden = false;
    this.documentoAprobacion = null;
    this.anexos = [];
    this.destinatarios = [{ orden: 1, usuario: null, searchTerm: '' }];
    this.showDocumentView = false;
  }

  private resolveTypedRecipients(): void {
    this.destinatarios.forEach((d) => {
      if (d.usuario) return;
      const term = (d.searchTerm || '').trim();
      if (!term) return;
      const match = term.match(/\(([^)]+)\)/);
      let user: Usuario | undefined;
      if (match && match[1]) {
        const username = match[1].trim();
        user = this.allUsers.find(u => u.usuario === username);
      }
      if (!user && /^\d+$/.test(term)) {
        const idNum = parseInt(term, 10);
        user = this.allUsers.find(u => u.noUsuario === idNum);
      }
      if (!user) {
        const t = term.toLowerCase();
        const matches = this.allUsers.filter(u =>
          (u.nombres + ' ' + u.apellidos).toLowerCase().includes(t) ||
          u.usuario.toLowerCase().includes(t)
        );
        if (matches.length === 1) user = matches[0];
      }
      if (user) {
        d.usuario = user;
        d.searchTerm = `${user.nombres} ${user.apellidos} (${user.usuario})`;
      }
    });
  }
}