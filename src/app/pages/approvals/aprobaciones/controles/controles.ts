import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-controles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './controles.html',
  styleUrls: ['./controles.css'],
})
export class Controles {
  @Output() cantidadChange = new EventEmitter<number>();
  @Output() toggleAprobadosChange = new EventEmitter<boolean>();
  @Output() busquedaChange = new EventEmitter<string>();
}