import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedicalCard } from '../../../models';
import { MedicalCardsService } from '../../services/medical-card.service';

@Component({
  selector: 'app-medical-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './medical-card.component.html',
  styleUrls: ['./medical-card.component.css']
})
export class MedicalCardComponent {
  @Input() card!: MedicalCard;
  @Input() patientId!: number;   // ID пациента, переданный из родителя
  @Output() edit = new EventEmitter<MedicalCard>();
  @Output() delete = new EventEmitter<MedicalCard>();

  private cardsService = inject(MedicalCardsService);

  onEdit() { this.edit.emit(this.card); }
  onDelete() { this.delete.emit(this.card); }

  downloadReport(): void {
    if (!this.patientId) {
      console.error('patientId не передан в компонент');
      return;
    }
    const cardId = this.card.id;
    this.cardsService.downloadPdf(this.patientId, cardId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagnosis_${this.card.visit_date}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      },
      error: (err) => {
        console.error('Ошибка при скачивании отчёта', err);
      }
    });
  }
}