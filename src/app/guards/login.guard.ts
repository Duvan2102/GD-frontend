import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): boolean | UrlTree {

    // Si el usuario ya está autenticado, redirigir al inicio
    if (this.authService.isAuthenticated()) {
      return this.router.createUrlTree(['/']);
    }

    // Si no está autenticado, permitir acceso al login
    return true;
  }
}


