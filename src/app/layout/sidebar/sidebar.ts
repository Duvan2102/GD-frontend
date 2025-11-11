import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class Sidebar implements OnInit, OnDestroy {
  canShowUsers = false;
  canShowAdmin = false;
  canShowReports = false;
  private userSubscription?: Subscription;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.updatePermissions();
    
    this.userSubscription = this.authService.getCurrentUser().subscribe(() => {
      this.updatePermissions();
    });
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  private updatePermissions(): void {
    this.canShowUsers = this.authService.canAccessUsers();
    this.canShowAdmin = this.authService.canAccessAdmin();
    this.canShowReports = this.authService.canAccessReports();
  }
}