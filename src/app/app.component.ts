import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutComponent } from './layout/layout..component';
import { Approvals } from "./pages/approvals/approvals";
import { Aprobaciones } from './pages/approvals/aprobaciones/aprobaciones';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ LayoutComponent,],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  protected title = 'gd-frontend';
}
