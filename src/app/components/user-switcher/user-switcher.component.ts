import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Usuario } from '../../interfaces/common.interfaces';
import { Position } from '../../services/positions.service';

@Component({
  selector: 'app-user-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="user-switcher" *ngIf="showSwitcher">
      <div class="switcher-header">
        <h6>Cambiar Usuario (Temporal)</h6>
        <button class="btn-close" (click)="toggleSwitcher()">×</button>
      </div>
      <div class="user-list">
        <div 
          *ngFor="let user of users" 
          class="user-item"
          [class.active]="user.noUsuario === currentUser?.noUsuario"
          (click)="switchUser(user.noUsuario)">
          <div class="user-info">
            <strong>{{ user.nombres }} {{ user.apellidos }}</strong>
            <small>{{ user.usuario }} - {{ user.cargo }}</small>
            <span class="user-role" [class.admin]="user.cargoCompleto.permisos?.esAdministrador">
              {{ user.cargoCompleto.permisos?.esAdministrador ? 'ADMIN' : 'USER' }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <button 
      class="user-switcher-toggle" 
      (click)="toggleSwitcher()"
      title="Cambiar Usuario">
      👤 {{ currentUser?.nombres }} {{ currentUser?.apellidos }}
    </button>
  `,
  styles: [`
    .user-switcher-toggle {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 9999;
      background: #007bff;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 12px;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }

    .user-switcher {
      position: fixed;
      top: 50px;
      right: 10px;
      z-index: 9999;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      max-width: 300px;
      max-height: 400px;
      overflow-y: auto;
    }

    .switcher-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 15px;
      border-bottom: 1px solid #eee;
      background: #f8f9fa;
    }

    .switcher-header h6 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #666;
    }

    .user-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .user-item {
      padding: 12px 15px;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .user-item:hover {
      background-color: #f8f9fa;
    }

    .user-item.active {
      background-color: #e3f2fd;
      border-left: 3px solid #2196f3;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .user-info strong {
      font-size: 13px;
      color: #333;
    }

    .user-info small {
      font-size: 11px;
      color: #666;
    }

    .user-role {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      background: #6c757d;
      color: white;
      width: fit-content;
    }

    .user-role.admin {
      background: #dc3545;
    }
  `]
})
export class UserSwitcherComponent implements OnInit {
  users: (Usuario & { cargoCompleto: Position })[] = [];
  currentUser: (Usuario & { cargoCompleto: Position }) | null = null;
  showSwitcher = false;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.users = this.authService.getAllUsers();
    this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
    });
  }

  toggleSwitcher() {
    this.showSwitcher = !this.showSwitcher;
  }

  switchUser(userId: number) {
    const success = this.authService.switchUser(userId);
    if (success) {
      this.showSwitcher = false;
    }
  }
}
