import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class TwoFAGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): boolean | UrlTree {

    // Verificar si se requiere 2FA y hay token temporal
    if (this.authService.isTwoFARequired() && this.authService.getTempToken()) {
      return true;
    }

    // Si no se requiere 2FA, redirigir al login
    return this.router.createUrlTree(['/login']);
  }
}
