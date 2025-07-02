import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Sidebar} from './sidebar/sidebar';

@Component({
  selector: 'app-layout',
  imports: [
     CommonModule,
    RouterOutlet,
    Sidebar
  ],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css']
})
export class Layout {

}
