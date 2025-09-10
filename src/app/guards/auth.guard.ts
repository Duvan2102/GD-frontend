import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): boolean | UrlTree {

    console.log('🛡️ AuthGuard: Verificando autenticación...');
    console.log('🛡️ Ruta solicitada:', state.url);
    console.log('🛡️ Usuario actual:', this.authService.getCurrentUserValue());
    console.log('🛡️ Está autenticado:', this.authService.isAuthenticated());
    console.log('🛡️ Token existe:', !!this.authService.getToken());

    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      console.log('🛡️ Usuario no autenticado, redirigiendo al login');
      return this.router.createUrlTree(['/login']);
    }

    console.log('🛡️ Usuario autenticado, permitiendo acceso');

    const requiredPermission = route.data['permission'] as keyof AuthService;

    if (!requiredPermission) {
      return true;
    }

    if (typeof this.authService[requiredPermission] !== 'function') {
        return this.router.createUrlTree(['/approvals']);
    }

    const hasPermission = (this.authService[requiredPermission] as () => boolean)();

    if (hasPermission) {
      return true;
    } else {
      return this.router.createUrlTree(['/approvals']);
    }
  }
}
