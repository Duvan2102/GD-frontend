import { Component, Output, EventEmitter, OnInit, ChangeDetectorRef, Input, ViewChild, ElementRef, HostListener, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TypologyService, Typology } from '../../../services/typology.service';
import { UserService } from '../../../services/user.service';
import { RecipientService, Destinatario } from '../../../services/recipient.service';
import { Usuario, UsuarioData } from '../../../interfaces/common.interfaces';
import { DocumentView, DocumentViewData } from '../document-view/document-view';
import { ConfirmModal } from '../../users/confirm-modal/confirm-modal';

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
  // Campos adicionales para la vista de documentos
  documentoUrl?: string;
  documentoFileName?: string;
}

@Component({
  selector: 'app-create-form',
  standalone: true,
  imports: [CommonModule, FormsModule, DocumentView, ConfirmModal],
  templateUrl: './create-form.html',
  styleUrls: ['./create-form.css']
})
export class CreateForm implements OnInit, OnChanges {
  @ViewChild('docView') docView!: DocumentView;
  @Input() isVisible: boolean = false;
  @Input() currentUser: UsuarioData | null = null;
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
    private recipientService: RecipientService,
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

  ngOnDestroy(): void {
    // Limpiar cualquier suscripción si es necesario
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentUser'] && changes['currentUser'].currentValue) {
      // Si hay un dropdown activo, actualizar el filtrado
      if (this.activeRecipientIndex !== null && this.destinatarios[this.activeRecipientIndex].searchTerm) {
        const currentRecipient = this.destinatarios[this.activeRecipientIndex];
        const searchTerm = currentRecipient.searchTerm.toLowerCase();
        this.filteredUsers = this.filterUsersLocally(searchTerm, this.activeRecipientIndex);
      }
    }
  }



  loadTypologies(): void {
    this.typologyService.getAll().subscribe({
      next: (data) => { this.tipologias = data; },
      error: (error) => { this.errorMessage = 'Error al cargar las tipologías.'; }
    });
  }

  loadUsers(): void {
    this.userService.obtenerUsuarios().subscribe({
      next: (data) => {
        this.allUsers = data;
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar los usuarios.';
      }
    });
  }

  onSearchUser(event: Event, index: number, inputElement: HTMLInputElement): void {
    const searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    this.destinatarios[index].searchTerm = searchTerm;
    this.destinatarios[index].originalSearchTerm = searchTerm;
    this.activeRecipientIndex = index;
    this.highlightedUserIndex = -1;

    // Filtrar usuarios directamente en el frontend
    this.filteredUsers = this.filterUsersLocally(searchTerm, index);

    if (this.filteredUsers.length > 0) {
      this.calculateDropdownPosition(inputElement);
    }
  }

  private filterUsersLocally(searchTerm: string, currentIndex: number): Usuario[] {
    if (!searchTerm || searchTerm.length <= 1) return [];
    if (!this.allUsers || this.allUsers.length === 0) return [];

    // Obtener IDs de usuarios ya seleccionados (excluyendo el campo actual)
    const selectedUserIds = this.destinatarios
      .map((d, i) => i !== currentIndex && d.usuario ? this.getUserId(d.usuario) : null)
      .filter(id => id != null) as number[];

    const creatorUserId = this.getUserId(this.currentUser);
    const searchTermLower = searchTerm.toLowerCase();

    const filtered = this.allUsers.filter(user => {
      const userId = this.getUserId(user);

      // 1. Verificar coincidencia de búsqueda
      const matchesSearch = user.nombres?.toLowerCase().includes(searchTermLower) ||
                           user.apellidos?.toLowerCase().includes(searchTermLower) ||
                           user.usuario?.toLowerCase().includes(searchTermLower);

      if (!matchesSearch) return false;

      // 2. Excluir usuario creador
      if (creatorUserId && userId === creatorUserId) {
        return false;
      }

      // 3. Excluir usuarios ya seleccionados
      if (userId && selectedUserIds.includes(userId)) {
        return false;
      }

      return true;
    });

    return filtered;
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

  // Función auxiliar para obtener el ID del usuario de manera robusta
  private getUserId(user: UsuarioData | Usuario | null): number | null {
    // Verificar que el usuario no sea null
    if (!user) return null;

    // Si es UsuarioData, usar idUsuario
    if ('idUsuario' in user) {
      return user.idUsuario;
    }

    // Si es Usuario, usar noUsuario
    if ('noUsuario' in user) {
      return user.noUsuario;
    }

    return null;
  }

  selectUser(user: Usuario, index: number): void {
    const userId = this.getUserId(user);


    // Verificar que no sea el usuario creador
    const currentUserId = this.getUserId(this.currentUser);
    if (currentUserId && userId === currentUserId) {
      alert('No puedes seleccionarte a ti mismo como destinatario');
      return;
    }

    // Verificar que no esté ya seleccionado en otro campo (excluyendo el campo actual)
    const isAlreadySelected = this.destinatarios.some((d, i) =>
      i !== index && d.usuario && this.getUserId(d.usuario) === userId
    );


    if (isAlreadySelected) {
      alert('Este usuario ya está seleccionado en otro campo');
      return;
    }

    // Si el usuario ya está seleccionado en el campo actual, permitir la selección (para reemplazar)
    this.destinatarios[index].usuario = user;
    this.destinatarios[index].searchTerm = `${user.nombres} ${user.apellidos}`;
    this.destinatarios[index].originalSearchTerm = `${user.nombres} ${user.apellidos}`;
    this.filteredUsers = [];
    this.activeRecipientIndex = -1;
    this.highlightedUserIndex = -1;

    // Agregar nuevo campo automáticamente después de la selección
    this.addNewUserFieldAfterSelection(index);
  }

  private addNewUserFieldAfterSelection(selectedIndex: number): void {
    // Solo agregar un nuevo campo si este es el último campo y no está vacío
    if (selectedIndex === this.destinatarios.length - 1 && this.destinatarios[selectedIndex].usuario) {
      const nuevoOrden = this.destinatarios.length + 1;
      this.destinatarios.push(this.recipientService.createNewRecipient(nuevoOrden));

      // Enfocar el nuevo campo después de un pequeño delay
      setTimeout(() => {
        const newInput = document.querySelector(`input[placeholder*="Escriba aquí los nombres"]:last-of-type`) as HTMLInputElement;
        if (newInput) {
          newInput.focus();
        }
      }, 100);
    }
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
    this.destinatarios.push(this.recipientService.createNewRecipient(nuevoOrden));
  }

  eliminarDestinatario(index: number): void {
    if (this.destinatarios.length > 1) {
      this.destinatarios.splice(index, 1);
      this.reordenarDestinatarios();
    } else {
      this.destinatarios[0] = { orden: 1, usuario: null, searchTerm: '' };
    }

    // Si hay un campo activo, actualizar el filtrado
    if (this.activeRecipientIndex !== null && this.destinatarios[this.activeRecipientIndex]?.searchTerm) {
      const searchTerm = this.destinatarios[this.activeRecipientIndex].searchTerm.toLowerCase();
      this.filteredUsers = this.filterUsersLocally(searchTerm, this.activeRecipientIndex);
    }
  }

  private reordenarDestinatarios(): void {
    this.recipientService.reorderRecipients(this.destinatarios);
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

  onDiscardFromView(): void {
    // Cerrar la vista de documento
    this.showDocumentView = false;
    // Cerrar la modal de creación y limpiar todo
    this.resetForm();
    this.close.emit();
  }

  onCancelar(): void {
    this.close.emit();
    this.resetForm();
  }

  onGuardar(): void {
    // Resolver destinatarios
    this.recipientService.resolveTypedRecipients(this.destinatarios, this.allUsers);

    // Validar formulario
    if (!this.isFormValid()) {
      alert('Por favor completa todos los campos obligatorios, incluyendo al menos un destinatario válido.');
      return;
    }

    const solicitudData: SolicitudData = {
      nombreSolicitud: this.nombreSolicitud,
      detallesAdicionales: this.detallesAdicionales,
      prioridad: this.prioridad,
      tipologia: this.tipologia,
      enviarRecordatorio: this.enviarRecordatorio,
      documentosAnexos: this.documentosAnexos,
      establecerOrden: this.establecerOrden,
      destinatarios: this.recipientService.convertDestinatariosToData(this.destinatarios, this.establecerOrden),
      documentoAprobacion: this.documentoAprobacion || undefined,
      anexos: this.anexos.length > 0 ? this.anexos : undefined,
    };

    this.onSaved.emit(solicitudData);
    this.resetForm();
  }

  isFormValid(): boolean {
    return !!(this.nombreSolicitud.trim() && this.tipologia && this.recipientService.hasValidRecipients(this.destinatarios));
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
    this.destinatarios = [this.recipientService.createNewRecipient(1)];
    this.showDocumentView = false;
  }


}
