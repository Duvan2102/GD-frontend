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

    console.log('TwoFAGuard checking 2FA state...');
    console.log('Route:', route.routeConfig?.path);
    console.log('2FA required:', this.authService.isTwoFARequired());
    console.log('Temp token exists:', !!this.authService.getTempToken());
    console.log('Temp token value:', this.authService.getTempToken());

    // Verificar si se requiere 2FA y hay token temporal
    if (this.authService.isTwoFARequired() && this.authService.getTempToken()) {
      console.log('2FA required with temp token, allowing access to', route.routeConfig?.path);
      return true;
    }

    // Si no se requiere 2FA, redirigir al login
    console.log('2FA not required or no temp token, redirecting to login');
    return this.router.createUrlTree(['/login']);
  }
}
