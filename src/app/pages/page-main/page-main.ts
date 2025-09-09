import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ApprovalService } from '../../services/approval.service';
import { UserService } from '../../services/user.service';
import { UsuarioData } from '../../interfaces/common.interfaces';

interface StatusStats {
  aprobadas: number;
  pendientes: number;
  atendidas: number;
  gestionadas: number;
  totales: number;
  porAtender: number;
  enCurso: number;
  rechazadas: number;
  canceladas: number;
}

@Component({
  selector: 'app-page-main',
  imports: [CommonModule],
  templateUrl: './page-main.html',
  styleUrl: './page-main.css'
})
export class PageMain implements OnInit, OnDestroy {
  currentUser: UsuarioData | null = null;
  receivedStats: StatusStats = {
    aprobadas: 0,
    pendientes: 0,
    atendidas: 0,
    gestionadas: 0,
    totales: 0,
    porAtender: 0,
    enCurso: 0,
    rechazadas: 0,
    canceladas: 0
  };
  sentStats: StatusStats = {
    aprobadas: 0,
    pendientes: 0,
    atendidas: 0,
    gestionadas: 0,
    totales: 0,
    porAtender: 0,
    enCurso: 0,
    rechazadas: 0,
    canceladas: 0
  };

  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private approvalService: ApprovalService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    
    // Actualizar estadísticas cada 30 segundos
    const updateInterval = setInterval(() => {
      if (this.currentUser) {
        this.loadApprovalStats();
      }
    }, 30000);
    
    // Limpiar el interval cuando el componente se destruya
    this.subscriptions.push({
      unsubscribe: () => clearInterval(updateInterval)
    } as Subscription);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadUserData(): void {
    const userSub = this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadApprovalStats();
      }
    });
    this.subscriptions.push(userSub);
  }

  private loadApprovalStats(): void {
    if (!this.currentUser?.idUsuario) {
      console.warn('No hay usuario autenticado para cargar estadísticas');
      return;
    }

    const userId = this.currentUser.idUsuario;
    
    // Obtener todos los usuarios para mapear correctamente
    const allUsers = this.authService.getAllUsers();
    
    // Recibidas: combinar pendientes a gestionar + histórico para incluir todos los estados
    const pendientes$ = this.approvalService
      .getApprovalsForApprover(userId, allUsers, 0, 1000)
      .pipe(
        catchError(error => {
          console.error('Error cargando pendientes para aprobar:', error);
          return of([]);
        })
      );

    const historico$ = this.approvalService
      .getHistorico(userId, allUsers, 0, 1000)
      .pipe(
        catchError(error => {
          console.error('Error cargando histórico de aprobaciones:', error);
          return of([]);
        })
      );

    const receivedSub = forkJoin([pendientes$, historico$])
      .pipe(
        map(([pendientes, historico]) => {
          const mapById = new Map<string, any>();
          [...pendientes, ...historico].forEach(item => {
            if (item && item.id != null) {
              mapById.set(String(item.id), item);
            }
          });
          return Array.from(mapById.values());
        }),
        map(approvals => this.calculateReceivedStats(approvals)),
        catchError(error => {
          console.error('Error calculando estadísticas recibidas:', error);
          return of(this.getEmptyStats());
        })
      )
      .subscribe(stats => {
        this.receivedStats = stats;
        console.log('Estadísticas recibidas (todas):', stats);
      });

    // Enviadas: creadas por el usuario (incluye todos los estados devueltos por el backend)
    const sentSub = this.approvalService.getApprovalsByCreator(userId, allUsers, 0, 1000)
      .pipe(
        map(approvals => this.calculateSentStats(approvals)),
        catchError(error => {
          console.error('Error cargando solicitudes enviadas:', error);
          return of(this.getEmptyStats());
        })
      )
      .subscribe(stats => {
        this.sentStats = stats;
        console.log('Estadísticas enviadas:', stats);
      });

    this.subscriptions.push(receivedSub, sentSub);
  }

  private calculateReceivedStats(approvals: any[]): StatusStats {
    const stats = this.getEmptyStats();
    
    approvals.forEach(approval => {
      stats.totales++;
      
      // Verificar si el usuario actual aprobó o rechazó esta solicitud
      const userApprovedOrRejected = this.didUserApproveOrReject(approval);
      
      switch (approval.status) {
        case 'APROBADO':
          stats.aprobadas++;
          if (userApprovedOrRejected) {
            stats.atendidas++;
          }
          stats.gestionadas++;
          break;
        case 'PENDIENTE':
          stats.pendientes++;
          break;
        case 'RECHAZADO':
          stats.rechazadas++;
          if (userApprovedOrRejected) {
            stats.atendidas++;
          }
          stats.gestionadas++;
          break;
        case 'CANCELADA':
          stats.canceladas++;
          if (userApprovedOrRejected) {
            stats.atendidas++;
          }
          stats.gestionadas++;
          break;
        default:
          if (userApprovedOrRejected) {
            stats.atendidas++;
          }
          stats.gestionadas++;
      }
    });

    // Calcular solicitudes por atender (pendientes)
    stats.porAtender = stats.pendientes;

    return stats;
  }

  private calculateSentStats(approvals: any[]): StatusStats {
    const stats = this.getEmptyStats();
    
    approvals.forEach(approval => {
      stats.totales++;
      
      switch (approval.status) {
        case 'APROBADO':
          stats.aprobadas++;
          stats.gestionadas++;
          break;
        case 'PENDIENTE':
          stats.pendientes++;
          break;
        case 'RECHAZADO':
          stats.rechazadas++;
          stats.gestionadas++;
          break;
        case 'CANCELADA':
          stats.canceladas++;
          stats.gestionadas++;
          break;
        default:
          stats.pendientes++;
      }
    });

    // Calcular solicitudes en curso (pendientes)
    stats.enCurso = stats.pendientes;

    return stats;
  }

  private getEmptyStats(): StatusStats {
    return {
      aprobadas: 0,
      pendientes: 0,
      atendidas: 0,
      gestionadas: 0,
      totales: 0,
      porAtender: 0,
      enCurso: 0,
      rechazadas: 0,
      canceladas: 0
    };
  }

  /**
   * Verifica si el usuario actual aprobó o rechazó esta solicitud
   */
  private didUserApproveOrReject(approval: any): boolean {
    if (!this.currentUser?.idUsuario) {
      return false;
    }

    const userId = this.currentUser.idUsuario;
    
    // Buscar en el historial de acciones si el usuario aprobó o rechazó
    const historial = approval.fullData?.historialAcciones || approval.fullData?.historial || [];
    const userAction = historial.find((action: any) => {
      const actionUserId = action.actorUsuarioId || action.usuarioId || action.usuario;
      return actionUserId === userId || actionUserId === String(userId);
    });

    if (userAction) {
      const accion = userAction.accion || userAction.action || '';
      const accionUpper = accion.toUpperCase();
      return accionUpper.includes('APROBAR') || accionUpper.includes('RECHAZAR') || 
             accionUpper === 'APROBADO' || accionUpper === 'RECHAZADO';
    }

    // Si no hay historial, verificar en los destinatarios
    const destinatarios = approval.fullData?.destinatarios || [];
    const userDestinatario = destinatarios.find((dest: any) => {
      const destUserId = dest.usuarioId || dest.noUsuarioId;
      return destUserId === userId || destUserId === String(userId);
    });

    if (userDestinatario) {
      const decision = userDestinatario.decision || userDestinatario.estado || '';
      const decisionUpper = decision.toUpperCase();
      return decisionUpper === 'APROBADO' || decisionUpper === 'RECHAZADO';
    }

    return false;
  }
}

