import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './controls.html',
  styleUrls: ['./controls.css'],
})
export class Controls {
  @Output() quantityChange = new EventEmitter<number>();
  @Output() toggleApprovedChange = new EventEmitter<boolean>();
  @Output() searchChange = new EventEmitter<string>();
}