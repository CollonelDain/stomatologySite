import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicalCard } from '../../../models';

@Component({
    selector: 'app-medical-card',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="medical-card">
  <div class="card-header">
    <span class="visit-date">{{ card.visit_date | date:'dd.MM.yyyy' }}</span>
    <div class="card-actions">
      <button class="edit-btn" (click)="onEdit()" title="Редактировать">✏️</button>
      <button class="delete-btn" (click)="onDelete()" title="Удалить">🗑️</button>
    </div>
  </div>
  <div class="diagnosis">{{ card.diagnosis }}</div>
</div>
  `,
    styles: [`
    .medical-card { background: #f9f9fc; border-radius: 12px; padding: 12px 16px; margin-bottom: 10px; margin-right: 10px; border-left: 4px solid #8fd3fe; transition: 0.2s; }
.medical-card:hover { background: #f0f8ff; transform: translateX(4px); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.visit-date { font-size: 0.8rem; color: #666; }
.card-actions { display: flex; gap: 8px; }
.edit-btn, .delete-btn { background: transparent; border: none; cursor: pointer; font-size: 1rem; opacity: 0.6; transition: 0.2s; }
.edit-btn:hover { opacity: 1; color: #1976d2; }
.delete-btn:hover { opacity: 1; color: #d32f2f; }
.diagnosis { font-weight: 500; font-size: 0.95rem; color: #2c3e50; }
  `]
})
export class MedicalCardComponent {
    @Input() card!: MedicalCard;
    @Output() edit = new EventEmitter<MedicalCard>();
    @Output() delete = new EventEmitter<MedicalCard>();

    onEdit() { this.edit.emit(this.card); }
    onDelete() { this.delete.emit(this.card); }
}