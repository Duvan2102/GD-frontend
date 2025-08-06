import { Component } from '@angular/core';

@Component({
  selector: 'app-modal-user',
  templateUrl: './modal-user.html',
  styleUrls: ['./modal-user.css']
})
export class ModalUser {
  
  cerrarModal(): void {
    console.log('Modal cerrado');
  }

}