// main.ts - Configuración optimizada sin duplicados
import { enableProdMode, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { App } from './app/app';
import { routes } from './app/app.routes';
import { environment } from './app/environments/environment';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';


if (environment.production) {
  enableProdMode();
}

bootstrapApplication(App, {
  providers: [
    provideHttpClient(),
    importProvidersFrom(
      RouterModule.forRoot(routes),
      HttpClient
    )
  ]
})
.catch(err => console.error(err));

bootstrapApplication(App, {
  providers: [
    provideHttpClient(
      withInterceptorsFromDi()
    ),
    provideRouter(routes),
  ]
}).catch(err => console.error('Error al inicializar la aplicación:', err));