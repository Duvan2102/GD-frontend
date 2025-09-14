import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { Sidebar} from './sidebar/sidebar';
import { ProfileModal } from '../components/profile-modal/profile-modal';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';
import { UsuarioData } from '../interfaces/common.interfaces';

@Component({
  selector: 'app-layout',
  imports: [
     CommonModule,
    RouterOutlet,
    Sidebar,
    ProfileModal
  ],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css']
})
export class Layout implements OnInit, OnDestroy {
  currentUser: UsuarioData | null = null;
  private userSubscription?: Subscription;
  isProfileModalVisible = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userSubscription = this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Error en logout:', error);
        // Aunque falle el logout en el backend, navegar al login
        this.router.navigate(['/login']);
      }
    });
  }

  getInitials(): string {
    if (!this.currentUser) return 'U';
    const names = this.currentUser.nombres.split(' ');
    const surnames = this.currentUser.apellidos.split(' ');
    return (names[0]?.[0] || '') + (surnames[0]?.[0] || '');
  }

  openProfileModal(): void {
    this.isProfileModalVisible = true;
  }

  closeProfileModal(): void {
    this.isProfileModalVisible = false;
  }

  onSaveProfile(userData: UsuarioData): void {
    this.authService.updateCurrentUser(userData).subscribe({
      next: () => {
        this.closeProfileModal();
      },
      error: (error) => {
        console.error('Error actualizando usuario:', error);
        this.closeProfileModal();
      }
    });
  }
}
