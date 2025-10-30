import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { FooterControls } from '../approvals/footer-controls/footer-controls';
import { FilterData, AdvancedFilters } from './advanced-filters/advanced-filters';
import { ApprovalService } from '../../services/approval.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { TypologyService } from '../../services/typology.service';
import { AuditService, AuditFilters } from '../../services/audit.service';
import { Usuario, UsuarioData } from '../../interfaces/common.interfaces';
import { Approval } from '../approvals/approvals';
import { RequestSuccessModal, SuccessModalData } from '../create-request/request-success-modal/request-success-modal';
import { DocumentView, DocumentViewData } from '../create-request/document-view/document-view';
import { delay } from 'rxjs/operators';

interface ReportItem {
  id: string;
  tipoSolicitud: string;
  codificacion: string;
  fechaCreacion: Date;
  usuarioCreador: string;
  usuarioCreadorUsername?: string; // Username del creador para filtros
  area: string;
  departamento: string;
  ultimaActualizacion: Date;
  estado: string;
  selected?: boolean;
}

type SortField = keyof Omit<ReportItem, 'selected'>;

@Component({
  selector: 'app-reports-audits',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    FooterControls,
    AdvancedFilters,
    RequestSuccessModal,
    DocumentView
  ],
  templateUrl: './reports-audits.html',
  styleUrls: ['./reports-audits.css']
})
export class ReportsAudits implements OnInit, OnDestroy {
  allItems: ReportItem[] = [];
  allUsers: Usuario[] = [];
  allTypologies: any[] = [];
  currentUser: UsuarioData | null = null;
  isLoading = false;
  private subscriptions: Subscription[] = [];
  displayedItems: ReportItem[] = [];
  private filteredItems: ReportItem[] = [];

  totalFiltered = 0;
  currentPage = 1;
  itemsPerPage = 10;
  currentOrder: SortField = 'fechaCreacion';
  ascendingOrder = false;

  // Filtros avanzados
  advancedFilters: FilterData = {
    fechaDesde: '',
    fechaHasta: '',
    estado: '',
    tipoSolicitud: '',
    solicitante: '',
    departamento: '',
    busqueda: ''
  };

  // Estado para rastrear si se han aplicado filtros
  private filtersHaveBeenApplied = false;

  // Propiedades para modales
  isDetailModalVisible = false;
  successModalData: SuccessModalData | null = null;
  isDocumentViewVisible = false;
  documentViewData: DocumentViewData | null = null;
  isLoadingDetails = false;

  constructor(
    private approvalService: ApprovalService,
    private userService: UserService,
    private authService: AuthService,
    private typologyService: TypologyService,
    private auditService: AuditService
  ) {}

  ngOnInit(): void {
    // No cargar datos inicialmente, solo cargar usuarios y tipologías para los filtros
    this.loadUsersAndTypologies();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadUsersAndTypologies(): void {
    this.isLoading = true;
    const userSub = this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        if (user) {
          this.loadUsersAndTypologiesOnly(user);
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
    
    this.subscriptions.push(userSub);
  }

  private loadUsersAndTypologiesOnly(user: UsuarioData): void {
    const usersSub = this.userService.obtenerUsuarios().subscribe({
      next: (users) => {
        this.allUsers = users;
        this.loadTypologiesOnly(user);
      },
      error: () => {
        this.loadTypologiesOnly(user);
      }
    });
    
    this.subscriptions.push(usersSub);
  }

  private loadTypologiesOnly(user: UsuarioData): void {
    const typologySub = this.typologyService.getAll().subscribe({
      next: (typologies: any[]) => {
        this.allTypologies = typologies;
        this.isLoading = false;
        // No cargar approvals inicialmente
      },
      error: () => {
        this.isLoading = false;
      }
    });
    
    this.subscriptions.push(typologySub);
  }

  private loadApprovals(user: UsuarioData): void {
    const approvalsSub = this.approvalService.getApprovalsByArea(
      user.idUsuario,
      this.allUsers,
      0,
      1000
    ).subscribe({
      next: (approvals) => {
        this.allItems = approvals.map(approval => this.mapApprovalToReportItem(approval));
        this.isLoading = false;
        this.applyViewLogic();
      },
      error: () => {
        this.isLoading = false;
        this.applyViewLogic();
      }
    });
    
    this.subscriptions.push(approvalsSub);
  }

  /**
   * Método para obtener TODAS las solicitudes sin filtros
   * Se ejecuta cuando todos los filtros están en "TODOS" o vacíos
   */
  private loadAllApprovalsWithoutFilters(): void {
    if (!this.currentUser) return;
    
    this.isLoading = true;
    console.log('🔄 Cargando TODAS las solicitudes sin filtros...');
    
    // Enviar filtros como objeto vacío para obtener todas las solicitudes
    const emptyFilters: AuditFilters = {};
    
    const requestBody = {
      filters: emptyFilters,
      page: 0,
      size: 1000, // Obtener hasta 1000 registros
      sort: 'createdAt,DESC'
    };
    
    console.log('🔍 Request para todas las solicitudes:', JSON.stringify(requestBody, null, 2));
    
    this.auditService.buscarSolicitudes(requestBody, this.currentUser.idUsuario).subscribe({
      next: (response) => {
        console.log('✅ Todas las solicitudes obtenidas:', response.totalElements);
        
        if (response.content && response.content.length > 0) {
          this.allItems = response.content.map(item => this.mapAuditItemToReportItem(item));
          console.log(`✅ ${this.allItems.length} solicitudes cargadas sin filtros`);
        } else {
          console.log('⚠️ No se encontraron solicitudes');
          this.allItems = [];
        }
        
        this.isLoading = false;
        this.applyViewLogic();
      },
      error: (error) => {
        console.error('❌ Error al obtener todas las solicitudes:', error);
        console.error('❌ Error details:', error.error);
        console.error('❌ Status:', error.status);
        this.isLoading = false;
        this.allItems = [];
        this.applyViewLogic();
      }
    });
  }

  private loadDataWithFilters(): void {
    if (!this.currentUser) return;
    
    this.isLoading = true;
    
    // Construir los filtros para el backend
    const filters: AuditFilters = {};
    console.log('Aplicando filtros:', this.advancedFilters);
    
    // Verificar si TODOS los filtros están en "TODOS" o vacíos
    const allFiltersAreAll = (
      (!this.advancedFilters.estado || this.advancedFilters.estado === '' || this.advancedFilters.estado === 'TODOS') &&
      (!this.advancedFilters.tipoSolicitud || this.advancedFilters.tipoSolicitud === '' || this.advancedFilters.tipoSolicitud === 'TODOS') &&
      (!this.advancedFilters.solicitante || this.advancedFilters.solicitante === '' || this.advancedFilters.solicitante === 'TODOS') &&
      (!this.advancedFilters.departamento || this.advancedFilters.departamento === '' || this.advancedFilters.departamento === 'TODOS') &&
      (!this.advancedFilters.fechaDesde || this.advancedFilters.fechaDesde === '') &&
      (!this.advancedFilters.fechaHasta || this.advancedFilters.fechaHasta === '') &&
      (!this.advancedFilters.busqueda || this.advancedFilters.busqueda === '')
    );
    
    if (allFiltersAreAll) {
      // Si TODOS los filtros están en "TODOS" o vacíos, usar el método específico para obtener TODAS las solicitudes
      console.log('🎯 Todos los filtros están en "TODOS" - Obteniendo TODAS las solicitudes');
      this.loadAllApprovalsWithoutFilters();
      return; // Salir del método ya que se está usando el método específico
    } else {
      // Aplicar filtros específicos solo si no están en "TODOS"
      
      // Filtros de fecha
      if (this.advancedFilters.fechaDesde || this.advancedFilters.fechaHasta) {
        filters.fechas = {};
        if (this.advancedFilters.fechaDesde) {
          filters.fechas.fechaDesde = this.advancedFilters.fechaDesde;
        }
        if (this.advancedFilters.fechaHasta) {
          filters.fechas.fechaHasta = this.advancedFilters.fechaHasta;
        }
      }
      
      // Filtro de estado - enviar solo si NO es "TODOS" o vacío
      if (this.advancedFilters.estado && this.advancedFilters.estado !== '' && this.advancedFilters.estado !== 'TODOS') {
        filters.estado = this.advancedFilters.estado;
      }
      
      // Filtro de tipo solicitud (tipología) - enviar solo si NO es "TODOS" o vacío
      if (this.advancedFilters.tipoSolicitud && this.advancedFilters.tipoSolicitud !== '' && this.advancedFilters.tipoSolicitud !== 'TODOS') {
        filters.tipologia = this.advancedFilters.tipoSolicitud;
      }
      
      // Filtro de solicitante (usuario creador) - enviar solo si NO es "TODOS" o vacío
      if (this.advancedFilters.solicitante && this.advancedFilters.solicitante !== '' && this.advancedFilters.solicitante !== 'TODOS') {
        filters.solicitante = this.advancedFilters.solicitante;
      }
      
      // Filtro de departamento - enviar solo si NO es "TODOS" o vacío
      if (this.advancedFilters.departamento && this.advancedFilters.departamento !== '' && this.advancedFilters.departamento !== 'TODOS') {
        filters.departamento = this.advancedFilters.departamento;
      }
      
      // Si no hay ningún filtro específico después de aplicar las reglas, enviar fechas vacías
      const hasSpecificFilters = filters.estado || 
                                 filters.tipologia || 
                                 filters.solicitante || 
                                 filters.departamento ||
                                 (filters.fechas && Object.keys(filters.fechas).length > 0);
      
      if (!hasSpecificFilters) {
        filters.fechas = {
          fechaDesde: '',
          fechaHasta: ''
        };
      }
    }
    
    // Filtro de búsqueda (aplicar en el frontend como filtro de texto)
    // Nota: este filtro se aplicará en el frontend después de recibir los datos
    // ya que puede buscar en múltiples campos
    
    console.log('Filtros enviados al backend:', JSON.stringify(filters, null, 2));
    console.log('Usuario ID:', this.currentUser?.idUsuario);
    
    if (!this.currentUser?.idUsuario) {
      console.error('Usuario no autenticado');
      this.isLoading = false;
      this.allItems = [];
      this.applyViewLogic();
      return;
    }
    
    this.auditService.buscarSolicitudes({
      filters: filters,
      page: 0,
      size: 1000,
      sort: 'createdAt,DESC'
    }, this.currentUser.idUsuario).subscribe({
      next: (response) => {
        console.log('✅ Respuesta del backend recibida:', JSON.stringify(response, null, 2));
        console.log('Total elementos en response:', response.totalElements);
        console.log('Content length:', response.content?.length);
        
        if (response.content && response.content.length > 0) {
          this.allItems = response.content.map(item => this.mapAuditItemToReportItem(item));
          console.log(`✅ ${this.allItems.length} solicitudes mapeadas correctamente`);
        } else {
          console.log('⚠️ No se recibieron solicitudes del backend');
          this.allItems = [];
        }
        
        this.isLoading = false;
        this.applyViewLogic();
      },
      error: (error) => {
        console.error('❌ Error al buscar solicitudes:', error);
        console.error('Status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error details:', error.error);
        console.error('URL:', error.url);
        console.error('Headers:', error.headers?.keys());
        
        this.isLoading = false;
        this.allItems = [];
        this.applyViewLogic();
      }
    });
  }

  private mapApprovalToReportItem(approval: Approval): ReportItem {
    const tipologia = this.allTypologies.find(t => t.idTipologia?.toString() === approval.type);
    const tipoSolicitud = tipologia?.descripcion || approval.type || 'SOLICITUD';
    const creador = this.allUsers.find(u => 
      u.usuario === approval.creatorUser || 
      u.idUsuario?.toString() === approval._creadorId?.toString()
    );
    
    // Obtener el departamento de la tipología
    let departamento = 'N/A';
    let area = 'N/A';
    
    if (tipologia?.cargo?.area?.departamento?.descripcion) {
      departamento = tipologia.cargo.area.departamento.descripcion;
      area = tipologia.cargo.area.descripcion;
    }
    
    // Si no se encuentra en la tipología, usar la información del creador como fallback
    if (departamento === 'N/A' && creador?.cargo?.area?.departamento?.descripcion) {
      departamento = creador.cargo.area.departamento.descripcion;
      area = creador.cargo.area.descripcion;
    }
    
    return {
      id: approval.id,
      tipoSolicitud: tipoSolicitud,
      codificacion: approval.type || 'N/A',
      fechaCreacion: new Date(approval.creationDate),
      usuarioCreador: approval.creatorFullName || approval.creatorUser || 'N/A',
      usuarioCreadorUsername: approval.creatorUser || creador?.usuario,
      area: area,
      departamento: departamento,
      ultimaActualizacion: new Date(approval.lastUpdate),
      estado: approval.status,
      selected: false
    };
  }

  private mapAuditItemToReportItem(item: any): ReportItem {
    // El backend envía directamente:
    // - "tipologia" (string): nombre de la tipología
    // - "solicitanteNombre" (string): nombre completo del solicitante
    // - "createdBy" (number): ID del usuario creador
    // - "createdAt" (string): fecha de creación
    // - "fechaRegistro" (string): fecha de registro
    
    // TIPO DE SOLICITUD: El backend envía directamente el nombre en "tipologia"
    const tipoSolicitud = item.tipologia || 
                          item.tipologiaDescripcion || 
                          item.tipologyDescription || 
                          item.tipoSolicitud ||
                          item.tipoSolicitudDescripcion ||
                          'SOLICITUD';
    
    // Buscar la tipología en el array allTypologies por descripción
    let tipologia = null;
    if (tipoSolicitud && tipoSolicitud !== 'SOLICITUD') {
      tipologia = this.allTypologies.find(t => 
        t.descripcion === tipoSolicitud || 
        t.descripcion.toLowerCase() === tipoSolicitud.toLowerCase()
      );
    }
    
    // VALIDACIÓN DE TIPO DE SOLICITUD: Registrar si no se encuentra
    if (!tipologia && tipoSolicitud && tipoSolicitud !== 'SOLICITUD') {
      console.warn('⚠️ Tipo de solicitud no encontrado en allTypologies:', {
        tipoSolicitudRecibido: tipoSolicitud,
        totalTipologias: this.allTypologies.length,
        muestraTipologias: this.allTypologies.slice(0, 5).map(t => t.descripcion)
      });
    }
    
    // SOLICITANTE: El backend envía el nombre en "solicitanteNombre" y el ID en "createdBy"
    const creadorId = item.createdBy || item.creadorId || item.creatorId || item.idCreador || item.usuarioCreadorId;
    const solicitanteNombre = item.solicitanteNombre || item.creadorNombre || item.creatorName || item.creador?.nombresApellidos;
    const creadorUsuario = item.creadorUsuario || item.creatorUser || item.creador?.usuario || item.creador?.nombreUsuario;
    
    // Buscar el usuario en allUsers por ID (createdBy) o por nombre
    let creador = null;
    if (creadorId) {
      creador = this.allUsers.find(u => 
        u.idUsuario === creadorId ||
        u.noUsuario === creadorId
      );
    }
    
    // Si no se encontró por ID, buscar por nombre del solicitante
    if (!creador && solicitanteNombre) {
      creador = this.allUsers.find(u => {
        const nombreCompleto = `${u.nombres} ${u.apellidos}`.trim();
        return nombreCompleto === solicitanteNombre || 
               nombreCompleto.toLowerCase() === solicitanteNombre.toLowerCase();
      });
    }
    
    // Si aún no se encontró, buscar por username
    if (!creador && creadorUsuario) {
      creador = this.allUsers.find(u => u.usuario === creadorUsuario);
    }
    
    // VALIDACIÓN DE SOLICITANTE: Registrar si no se encuentra
    if (!creador && (creadorId || solicitanteNombre || creadorUsuario)) {
      console.warn('⚠️ Solicitante no encontrado en allUsers:', {
        creadorId,
        solicitanteNombre,
        creadorUsuario,
        totalUsuarios: this.allUsers.length,
        muestraUsuarios: this.allUsers.slice(0, 5).map(u => ({
          id: u.idUsuario,
          nombre: `${u.nombres} ${u.apellidos}`.trim(),
          usuario: u.usuario
        }))
      });
    }
    
    // Obtener ID
    const id = String(item.id || item.solicitudId || item.idSolicitud || item.solicitud_id || '');
    
    // Limpiar el tipo de solicitud
    const tipoSolicitudFinal = tipoSolicitud.trim();
    
    // Obtener fecha de creación (el backend usa "fechaRegistro" o "createdAt")
    const fechaCreacion = item.fechaRegistro || item.fechaCreacion || item.createdAt || item.created_at || new Date();
    
    // Obtener username del creador para filtros (priorizar username)
    const usuarioCreadorUsername = creador?.usuario || 
                                    creadorUsuario || 
                                    item.creador?.usuario || 
                                    item.creadorNombreUsuario ||
                                    item.creadorUsername;
    
    // Obtener usuario creador - priorizar nombre completo del backend
    const usuarioCreador = solicitanteNombre || 
                          (creador ? `${creador.nombres} ${creador.apellidos}`.trim() : '') ||
                          item.creadorNombre || 
                          item.creatorName ||
                          creadorUsuario || 
                          'Usuario no encontrado';
    
    // Obtener área - intentar múltiples campos
    const area = item.areaDescripcion || 
                item.areaDescription || 
                item.area?.descripcion ||
                item.area || 
                'N/A';
    
    // Obtener departamento - el backend envía directamente el nombre
    const departamento = item.departamento || 
                        item.departamentoDescripcion || 
                        item.departamentoDescription || 
                        item.departamento?.descripcion ||
                        'N/A';
    
    // Obtener fecha de última actualización
    const ultimaActualizacion = item.ultimaActualizacion || 
                                item.lastUpdate || 
                                item.updatedAt || 
                                item.updated_at || 
                                item.fechaActualizacion ||
                                fechaCreacion;
    
    // Obtener estado - normalizar
    const estadoRaw = item.estado || item.status || 'PENDIENTE';
    const estado = estadoRaw.toUpperCase().trim();
    
    // Obtener codificación (ID de tipología) - priorizar el ID encontrado
    const codificacion = tipologia?.idTipologia ? String(tipologia.idTipologia) : 
                        (creadorId ? String(creadorId) : '');
    
    // VALIDACIÓN FINAL DE MAPEO: Verificar que los valores se asignaron correctamente
    console.log('📊 Mapeo de item:', {
      id,
      tipoSolicitudFinal,
      codificacion,
      usuarioCreador,
      estado,
      usuarioCreadorUsername,
      area,
      departamento
    });
    
    // Crear el item mapeado
    const reportItem: ReportItem = {
      id: id,
      tipoSolicitud: tipoSolicitudFinal,
      codificacion: codificacion,
      fechaCreacion: new Date(fechaCreacion),
      usuarioCreador: usuarioCreador,
      usuarioCreadorUsername: usuarioCreadorUsername,
      area: area,
      departamento: departamento,
      ultimaActualizacion: new Date(ultimaActualizacion),
      estado: estado,
      selected: false
    };
    
    // VALIDACIÓN POST-MAPEO: Verificar campos críticos
    if (!reportItem.tipoSolicitud || reportItem.tipoSolicitud === 'SOLICITUD') {
      console.warn('⚠️ Tipo de solicitud no mapeado correctamente:', {
        itemOriginal: item,
        tipoSolicitudResultante: reportItem.tipoSolicitud
      });
    }
    
    if (!reportItem.usuarioCreador || reportItem.usuarioCreador === 'Usuario no encontrado') {
      console.warn('⚠️ Usuario creador no mapeado correctamente:', {
        itemOriginal: item,
        usuarioCreadorResultante: reportItem.usuarioCreador
      });
    }
    
    return reportItem;
  }

  applyViewLogic(): void {
    // Si no hay datos cargados, no hacer nada
    if (this.allItems.length === 0) {
      this.displayedItems = [];
      this.filteredItems = [];
      this.totalFiltered = 0;
      return;
    }

    let result = [...this.allItems];

    // Filtros avanzados (incluye búsqueda)
    result = this.applyAdvancedFilters(result);

    this.filteredItems = result;
    this.totalFiltered = this.filteredItems.length;

    this.filteredItems.sort((a, b) => {
      let aVal: any = a[this.currentOrder];
      let bVal: any = b[this.currentOrder];
      
      // Manejar fechas correctamente
      if (this.currentOrder === 'fechaCreacion' || this.currentOrder === 'ultimaActualizacion') {
        aVal = aVal instanceof Date ? aVal.getTime() : new Date(aVal).getTime();
        bVal = bVal instanceof Date ? bVal.getTime() : new Date(bVal).getTime();
      }
      
      if (aVal < bVal) {
        return this.ascendingOrder ? -1 : 1;
      }
      if (aVal > bVal) {
        return this.ascendingOrder ? 1 : -1;
      }
      return 0;
    });

    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.displayedItems = this.filteredItems.slice(start, start + this.itemsPerPage);
  }

  private hasFiltersApplied(): boolean {
    // Considerar que hay filtros aplicados si:
    // 1. Hay fechas seleccionadas
    // 2. Hay búsqueda
    // 3. Cualquier filtro de selección ha sido modificado (incluso si es "TODOS")
    return !!(
      this.advancedFilters.fechaDesde ||
      this.advancedFilters.fechaHasta ||
      this.advancedFilters.busqueda ||
      this.advancedFilters.estado !== '' ||
      this.advancedFilters.tipoSolicitud !== '' ||
      this.advancedFilters.solicitante !== '' ||
      this.advancedFilters.departamento !== ''
    );
  }

  private applyAdvancedFilters(items: ReportItem[]): ReportItem[] {
    let result = [...items];

    // Filtro por fecha desde
    if (this.advancedFilters.fechaDesde) {
      const fechaDesde = new Date(this.advancedFilters.fechaDesde);
      result = result.filter(item => {
        const itemDate = new Date(item.fechaCreacion);
        return itemDate >= fechaDesde;
      });
    }

    // Filtro por fecha hasta
    if (this.advancedFilters.fechaHasta) {
      const fechaHasta = new Date(this.advancedFilters.fechaHasta);
      fechaHasta.setHours(23, 59, 59, 999); // Incluir todo el día
      result = result.filter(item => {
        const itemDate = new Date(item.fechaCreacion);
        return itemDate <= fechaHasta;
      });
    }

    // Filtro por estado (solo si no es "TODOS")
    if (this.advancedFilters.estado && this.advancedFilters.estado !== 'TODOS') {
      result = result.filter(item => item.estado === this.advancedFilters.estado);
    }

    // Filtro por tipo de solicitud (solo si no es "TODOS")
    if (this.advancedFilters.tipoSolicitud && this.advancedFilters.tipoSolicitud !== 'TODOS') {
      // Validar que el filtro funcione correctamente
      const totalBefore = result.length;
      const itemsBeforeFilter = [...result]; // Guardar copia para el warning
      result = result.filter(item => item.tipoSolicitud === this.advancedFilters.tipoSolicitud);
      const totalAfter = result.length;
      
      if (totalBefore > 0 && totalAfter === 0) {
        console.warn('⚠️ Filtro de tipo de solicitud no encontró coincidencias:', {
          tipoFiltro: this.advancedFilters.tipoSolicitud,
          totalAntes: totalBefore,
          totalDespues: totalAfter,
          tiposDisponibles: [...new Set(itemsBeforeFilter.map(r => r.tipoSolicitud))],
          muestraItems: itemsBeforeFilter.slice(0, 3).map(r => ({
            id: r.id,
            tipoSolicitud: r.tipoSolicitud
          }))
        });
      }
    }

    // Filtro por solicitante (solo si no es "TODOS")
    // Buscar tanto por username como por nombre completo
    if (this.advancedFilters.solicitante && this.advancedFilters.solicitante !== 'TODOS') {
      const totalBefore = result.length;
      const itemsBeforeFilter = [...result]; // Guardar copia para el warning
      
      result = result.filter(item => 
        item.usuarioCreadorUsername === this.advancedFilters.solicitante ||
        item.usuarioCreador === this.advancedFilters.solicitante
      );
      
      const totalAfter = result.length;
      
      // Validación de filtro de solicitante
      if (totalBefore > 0 && totalAfter === 0) {
        console.warn('⚠️ Filtro de solicitante no encontró coincidencias:', {
          solicitanteFiltro: this.advancedFilters.solicitante,
          totalAntes: totalBefore,
          totalDespues: totalAfter,
          solicitantesDisponibles: [...new Set(itemsBeforeFilter.map(r => r.usuarioCreador))],
          muestraItems: itemsBeforeFilter.slice(0, 3).map(r => ({
            id: r.id,
            usuarioCreador: r.usuarioCreador,
            usuarioCreadorUsername: r.usuarioCreadorUsername
          }))
        });
      }
    }

    // Filtro por departamento (solo si no es "TODOS")
    if (this.advancedFilters.departamento && this.advancedFilters.departamento !== 'TODOS') {
      result = result.filter(item => item.departamento === this.advancedFilters.departamento);
    }

    // Filtro de búsqueda
    if (this.advancedFilters.busqueda) {
      const term = this.advancedFilters.busqueda.toLowerCase();
      result = result.filter(item =>
        item.tipoSolicitud.toLowerCase().includes(term) ||
        item.usuarioCreador.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term)
      );
    }

    return result;
  }


  onQuantityChange(quantity: number): void {
    this.itemsPerPage = quantity;
    this.currentPage = 1;
    this.applyViewLogic();
  }

  onToggleApproved(value: boolean): void {
    // Este método no se usa en reports-audits pero se mantiene para compatibilidad
    // con el componente Controls
  }

  onSearchChange(term: string): void {
    // Este método no se usa en reports-audits pero se mantiene para compatibilidad
    // con el componente Controls
  }


  /**
   * Método público para obtener todas las solicitudes sin filtros
   * Se puede llamar desde el componente de filtros avanzados
   */
  public loadAllApprovals(): void {
    console.log('🔄 Método público llamado: Obteniendo todas las solicitudes');
    this.loadAllApprovalsWithoutFilters();
  }

  /**
   * Método público para aplicar filtros específicos
   * Se puede llamar desde el componente de filtros avanzados
   */
  public applySpecificFilters(): void {
    console.log('🔄 Método público llamado: Aplicando filtros específicos');
    this.loadDataWithFilters();
  }

  onAdvancedFilterChange(filters: FilterData): void {
    this.advancedFilters = filters;
    this.currentPage = 1;
    
    // Marcar que se han aplicado filtros
    this.filtersHaveBeenApplied = true;
    
    // Verificar si todos los filtros están en "TODOS" o vacíos
    const allFiltersAreAll = (
      (!filters.estado || filters.estado === '' || filters.estado === 'TODOS') &&
      (!filters.tipoSolicitud || filters.tipoSolicitud === '' || filters.tipoSolicitud === 'TODOS') &&
      (!filters.solicitante || filters.solicitante === '' || filters.solicitante === 'TODOS') &&
      (!filters.departamento || filters.departamento === '' || filters.departamento === 'TODOS') &&
      (!filters.fechaDesde || filters.fechaDesde === '') &&
      (!filters.fechaHasta || filters.fechaHasta === '') &&
      (!filters.busqueda || filters.busqueda === '')
    );
    
    if (allFiltersAreAll) {
      // Si todos los filtros están en "TODOS", obtener TODAS las solicitudes
      console.log('🎯 Filtros cambiados a "TODOS" - Obteniendo todas las solicitudes');
      this.loadAllApprovalsWithoutFilters();
    } else {
      // Aplicar filtros específicos
      this.loadDataWithFilters();
    }
  }

  onChangePage(page: number): void {
    this.currentPage = page;
    this.applyViewLogic();
  }

  sortBy(field: SortField): void {
    if (this.currentOrder === field) {
      this.ascendingOrder = !this.ascendingOrder;
    } else {
      this.currentOrder = field;
      this.ascendingOrder = true;
    }
    this.applyViewLogic();
  }

  getSortIcon(field: string): any {
    if (this.currentOrder !== field) return { 'bi-arrow-down-up': true, 'text-muted': true };
    return this.ascendingOrder ? { 'bi-arrow-down': true } : { 'bi-arrow-up': true };
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.displayedItems.forEach(item => item.selected = checked);
  }

  onManage(id: string): void {
    this.showDetailsModal(id);
  }

  private showDetailsModal(id: string): void {
    this.isLoadingDetails = true;
    const uid = this.currentUser?.idUsuario;

    this.approvalService.getApprovalDetails(id, this.allUsers, uid).pipe(delay(500))
      .subscribe(requestDetails => {
        if (requestDetails) {
          this.successModalData = requestDetails.fullData;
          this.isDetailModalVisible = true;
        }
        this.isLoadingDetails = false;
      });
  }

  closeDetailModal(): void {
    this.isDetailModalVisible = false;
    this.successModalData = null;
  }

  handleViewApprovedDocument(data: SuccessModalData): void {
    // Verificar si tenemos un File object en memoria (para solicitudes recién creadas)
    const mainDocumentFile = data?.documentoAprobacion ||
                            (data as any)?.documento ||
                            (data as any)?.archivo ||
                            (data as any)?.file;

    // Si tenemos el archivo en memoria (solicitud recién creada), usarlo directamente
    if (mainDocumentFile && mainDocumentFile instanceof File) {
      try {
        const documentUrl = URL.createObjectURL(mainDocumentFile);
        this.documentViewData = {
          id: data.id!,
          file: mainDocumentFile,
          url: documentUrl,
          title: data.nombreSolicitud,
          fileName: data.documentoFileName || data.pdfOriginalName || mainDocumentFile.name || 'Documento Principal'
        };
        this.isDetailModalVisible = false;
        this.isDocumentViewVisible = true;
        return;
      } catch (error) {
        console.error('Error creating object URL:', error);
      }
    }

    // Para todas las demás solicitudes, obtener el PDF del servidor
    if (data.id && this.currentUser?.idUsuario) {
      this.isLoadingDetails = true;

      this.approvalService.getDocumentPdf(data.id, this.currentUser.idUsuario).subscribe({
        next: (pdfBlob: Blob) => {
          const pdfUrl = URL.createObjectURL(pdfBlob);
          const fileName = data.pdfOriginalName || data.documentoFileName || `documento_${data.id}.pdf`;
          
          this.documentViewData = {
            id: data.id!,
            file: undefined,
            url: pdfUrl,
            title: data.nombreSolicitud,
            fileName: fileName,
            metadata: {
              pdfOriginalName: fileName,
              pdfSizeBytes: data.pdfSizeBytes,
              isPdfMetadata: false,
              isPdfFromService: true
            }
          };
          this.isDetailModalVisible = false;
          this.isDocumentViewVisible = true;
          this.isLoadingDetails = false;
        },
        error: (error) => {
          console.error('Error al cargar el documento desde el servidor:', error);
          this.isLoadingDetails = false;
          
          this.documentViewData = {
            id: data.id!,
            file: undefined,
            url: undefined,
            title: data.nombreSolicitud,
            fileName: data.pdfOriginalName || data.documentoFileName || 'Documento no disponible',
            metadata: {
              pdfOriginalName: data.pdfOriginalName || data.documentoFileName,
              pdfSizeBytes: data.pdfSizeBytes,
              isPdfMetadata: true,
              error: 'Error al cargar el documento desde el servidor. Verifique que el archivo existe.'
            }
          };
          this.isDetailModalVisible = false;
          this.isDocumentViewVisible = true;
        }
      });
    } else {
      // Si no hay ID o usuario, mostrar error
      this.documentViewData = {
        id: data.id!,
        file: undefined,
        url: undefined,
        title: data.nombreSolicitud,
        fileName: 'Documento no disponible',
        metadata: {
          error: 'No se pudo obtener la información del documento.'
        }
      };
      this.isDetailModalVisible = false;
      this.isDocumentViewVisible = true;
    }
  }

  closeDocumentView(): void {
    this.isDocumentViewVisible = false;
    this.documentViewData = null;
  }

  onClearAll(): void {
    // Limpiar todos los datos
    this.allItems = [];
    this.displayedItems = [];
    this.filteredItems = [];
    this.totalFiltered = 0;
    
    // Limpiar filtros
    this.advancedFilters = {
      fechaDesde: '',
      fechaHasta: '',
      estado: '',
      tipoSolicitud: '',
      solicitante: '',
      departamento: '',
      busqueda: ''
    };
    
    // Resetear estado de filtros aplicados
    this.filtersHaveBeenApplied = false;
    
    // Resetear paginación
    this.currentPage = 1;
  }

  onGenerateReport(): void {
    // Verificar que el usuario esté autenticado
    if (!this.currentUser?.idUsuario) {
      alert('Usuario no autenticado');
      return;
    }
    
    // Obtener IDs de solicitudes seleccionadas
    const selectedIds = this.allItems
      .filter(item => item.selected)
      .map(item => item.id);
    
    // Si no hay selección, usar todos los IDs filtrados
    const idsToExport = selectedIds.length > 0 ? selectedIds : this.filteredItems.map(item => item.id);
    
    if (idsToExport.length === 0) {
      alert('No hay solicitudes para exportar');
      return;
    }
    
    // Los IDs deben ser strings (tal como el backend los espera)
    const idsToExportStrings = idsToExport.map(id => String(id));
    
    console.log('📤 IDs a exportar:', idsToExportStrings);
    console.log('📤 Request body:', { selectedIds: idsToExportStrings });
    console.log('📤 User ID:', this.currentUser.idUsuario);
    
    if (idsToExportStrings.length === 0) {
      alert('No hay IDs válidos para exportar');
      return;
    }
    
    this.isLoading = true;
    
    // Llamar al servicio de auditoría para generar el Excel
    this.auditService.generarExcel({ selectedIds: idsToExportStrings }, this.currentUser.idUsuario).subscribe({
      next: (blob: Blob) => {
        console.log('✅ Excel recibido del backend:', {
          size: blob.size,
          type: blob.type
        });
        
        // Crear URL del blob y descargar
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Generar nombre de archivo con fecha y hora (formato yyyyMMdd_HHmmss)
        const now = new Date();
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        link.download = `auditoria_solicitudes_${timestamp}.xlsx`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Liberar URL del blob después de un pequeño delay
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);
        
        console.log(`✓ Informe descargado: auditoria_solicitudes_${timestamp}.xlsx`);
        
        this.isLoading = false;
      },
      error: async (error) => {
        console.error('❌ Error completo:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ StatusText:', error.statusText);
        console.error('❌ Error object:', error.error);
        
        // Intentar leer el error del backend
        let errorMessage = 'Error al generar el Excel. Por favor, intente nuevamente.';
        
        if (error.error instanceof Blob) {
          try {
            const errorText = await error.error.text();
            console.error('❌ Mensaje de error del backend:', errorText);
            
            try {
              const errorJson = JSON.parse(errorText);
              console.error('❌ Error JSON:', errorJson);
              errorMessage = errorJson.message || errorJson.error || errorJson.status || errorMessage;
            } catch (e) {
              errorMessage = errorText || errorMessage;
            }
          } catch (e) {
            console.error('❌ No se pudo leer el error:', e);
          }
        } else if (error.error && typeof error.error === 'object') {
          console.error('❌ Error object:', error.error);
          errorMessage = error.error.message || error.error.error || errorMessage;
        }
        
        alert(`Error: ${errorMessage}\n\nStatus: ${error.status || 'Unknown'}`);
        this.isLoading = false;
      }
    });
  }
}
