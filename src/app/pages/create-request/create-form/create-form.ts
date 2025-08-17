import { Component, Output, EventEmitter, OnInit, ChangeDetectorRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TypologyService, Typology } from '../../../services/typology.service';
import { UserService } from '../../../services/user.service';
import { Usuario } from '../../../interfaces/common.interfaces';
import { DocumentView, DocumentViewData } from '../document-view/document-view';

interface Destinatario {
  orden: number;
  usuario: Usuario | null;
  searchTerm: string;
}

export interface SolicitudData {
  nombreSolicitud: string;
  detallesAdicionales: string;
  prioridad: 'NORMAL' | 'IMPORTANTE';
  tipologia: string;
  enviarRecordatorio: 'NUNCA' | 'SEMANALMENTE' | 'CADA_3_DIAS' | 'TODOS_LOS_DIAS';
  documentosAnexos: boolean;
  establecerOrden: boolean;
  destinatarios: Array<{ usuarioId: string; orden?: number }>;
  documentoAprobacion?: File;
  anexos?: File[];
}

@Component({
  selector: 'app-create-form',
  standalone: true,
  imports: [CommonModule, FormsModule, DocumentView],
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
  destinatarios: Destinatario[] = [
    { orden: 1, usuario: null, searchTerm: '' },
    { orden: 2, usuario: null, searchTerm: '' }
  ];
  tipologias: Typology[] = [];
  successMessage = '';
  errorMessage = '';
  allUsers: Usuario[] = [];
  filteredUsers: Usuario[] = [];
  activeRecipientIndex: number | null = null;
  showDocumentView: boolean = false;
  documentViewData: DocumentViewData | null = null;

  constructor(
    private typologyService: TypologyService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

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
      next: (data) => {
        this.allUsers = data;
        if (this.allUsers.length > 0) {
            const helisaUser = this.allUsers.find(u => u.usuario === 'USUARIO.HELISA');
            if (helisaUser) {
              this.destinatarios[0].usuario = helisaUser;
              this.destinatarios[0].searchTerm = `${helisaUser.nombres} ${helisaUser.apellidos}`;
            }
        }
      },
      error: (error) => { this.errorMessage = 'Error al cargar los usuarios.'; }
    });
  }

  onSearchUser(event: Event, index: number): void {
    const searchTerm = (event.target as HTMLInputElement).value.toLowerCase();
    this.destinatarios[index].searchTerm = searchTerm;
    this.activeRecipientIndex = index;

    const selectedUserIds = this.destinatarios
      .map(d => d.usuario?.noUsuario)
      .filter(id => id != null);

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
  }

  validateRecipient(index: number): void {
    setTimeout(() => {
        const recipient = this.destinatarios[index];
        if (recipient && !recipient.usuario) {
            recipient.searchTerm = '';
        }
        this.activeRecipientIndex = null;
    }, 200);
  }

  selectUser(user: Usuario, index: number): void {
    this.destinatarios[index].usuario = user;
    this.destinatarios[index].searchTerm = `${user.nombres} ${user.apellidos}`;
    this.filteredUsers = [];
    this.activeRecipientIndex = null;
  }

  onDocumentoAprobacionChange(event: any): void {
    const file = event.target.files[0];
    if (file && this.isValidFileType(file)) {
      this.documentoAprobacion = file;
    } else {
      alert('Formato de archivo no válido. Solo se permite formato PDF');
      event.target.value = '';
    }
  }

  onAnexosChange(event: any): void {
    const file = event.target.files[0];
    if (file && this.isValidFileType(file)) {
      this.anexos = [file];
    } else {
      alert('Formato de archivo no válido. Solo se permite formatos PDF y Word');
      event.target.value = '';
    }
  }

  private isValidFileType(file: File): boolean {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    return allowedTypes.includes(file.type);
  }

  removeAnexo(index: number): void { this.anexos.splice(index, 1); }
  removeDocumentoAprobacion(): void { this.documentoAprobacion = null; }

  agregarDestinatario(): void {
    const nuevoOrden = this.destinatarios.length + 1;
    this.destinatarios.push({ orden: nuevoOrden, usuario: null, searchTerm: '' });
  }

  eliminarDestinatario(index: number): void {
    if (index === 0) {
      this.destinatarios[index].usuario = null;
      this.destinatarios[index].searchTerm = '';
    } else {
      if (this.destinatarios.length > 1) {
        this.destinatarios.splice(index, 1);
        this.reordenarDestinatarios();
      }
    }
  }

  private reordenarDestinatarios(): void {
    this.destinatarios.forEach((dest, index) => { dest.orden = index + 1; });
  }

  onEstablecerOrdenChange(): void {
    if (!this.establecerOrden) {
      this.destinatarios.forEach(dest => dest.orden = 0);
    } else {
      this.reordenarDestinatarios();
    }
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

  onCloseView(): void {
    this.showDocumentView = false;
    this.documentViewData = null;
  }

  onEditFromView(): void {
    this.showDocumentView = false;
  }

  onSendFromView(): void {
    this.onGuardar();
    this.showDocumentView = false;
  }

  onDeleteFromView(solicitudId: string | number): void {
    this.showDocumentView = false;
    this.deleteRequest.emit(solicitudId);
    this.onCloseView();
  }

  onCancelar(): void {
    this.resetForm();
    this.close.emit();
  }

  onGuardar(): void {
    if (this.isFormValid()) {
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
            .map(dest => ({
                usuarioId: dest.usuario!.usuario,
                orden: this.establecerOrden ? dest.orden : undefined
        })),
        documentoAprobacion: this.documentoAprobacion || undefined,
        anexos: this.anexos.length > 0 ? this.anexos : undefined
      };
      this.onSaved.emit(solicitudData);
      this.resetForm();
    } else {
      alert('Por favor completa todos los campos obligatorios.');
    }
  }

  public isFormValid(): boolean {
    return !!(
      this.nombreSolicitud.trim() &&
      this.tipologia &&
      this.destinatarios.some(dest => dest.usuario)
    );
  }

  private resetForm(): void {
    this.nombreSolicitud = '';
    this.detallesAdicionales = '';
    this.prioridad = 'NORMAL';
    this.tipologia = '';
    this.enviarRecordatorio = 'NUNCA';
    this.documentosAnexos = false;
    this.establecerOrden = false;
    this.documentoAprobacion = null;
    this.anexos = [];
    this.destinatarios = [
      { orden: 1, usuario: null, searchTerm: '' },
      { orden: 2, usuario: null, searchTerm: '' }
    ];
    this.showDocumentView = false;
    this.documentViewData = null;
    this.loadUsers();
  }
}