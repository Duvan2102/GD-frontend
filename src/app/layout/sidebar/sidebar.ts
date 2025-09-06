import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service'; 

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class Sidebar implements OnInit {
  canShowUsers = false;
  canShowAdmin = false;
  canShowReports = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.canShowUsers = this.authService.canAccessUsers();
    this.canShowAdmin = this.authService.canAccessAdmin();
    this.canShowReports = this.authService.canAccessReports();
  }
}