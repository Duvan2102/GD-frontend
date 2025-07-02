import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Layout} from './layout/layout';
import { Approvals } from "./pages/approvals/approvals";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ RouterOutlet,],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected title = 'gd-frontend';
}
