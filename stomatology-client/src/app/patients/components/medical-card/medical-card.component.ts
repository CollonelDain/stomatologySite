import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicalCard } from '../../../models';

@Component({
    selector: 'app-medical-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './medical-card.component.html',
    styleUrls: ['./medical-card.component.css']
})
export class MedicalCardComponent {
    @Input() card!: MedicalCard;
    @Output() edit = new EventEmitter<MedicalCard>();
    @Output() delete = new EventEmitter<MedicalCard>();

    onEdit() { this.edit.emit(this.card); }
    onDelete() { this.delete.emit(this.card); }
}