import { Component, EventEmitter, inject, Input, OnInit, Output } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MedicalCard } from "../../../../../models";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-medical-card-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
    <div class="card-form">
  <h3>{{ editCard ? 'Редактировать приём' : 'Новая приём' }}</h3>
  <form [formGroup]="cardForm" (ngSubmit)="onSubmit()">
    <div class="form-group">
      <label>Дата посещения</label>
      <input type="date" max="9999-12-31" formControlName="visit_date">
      <div class="field-error" *ngIf="cardForm.get('visit_date')?.invalid && cardForm.get('visit_date')?.touched">Обязательное поле (ГГГГ-ММ-ДД)</div>
    </div>
    <div class="form-group">
      <label>Диагноз</label>
      <textarea formControlName="diagnosis" rows="4"></textarea>
      <div class="field-error" *ngIf="cardForm.get('diagnosis')?.invalid && cardForm.get('diagnosis')?.touched">Диагноз обязателен</div>
    </div>
    <div class="form-actions">
      <button type="button" class="btn-secondary" (click)="onCancel()">Отмена</button>
      <button type="submit" class="btn-primary" [disabled]="cardForm.invalid || loading">{{ loading ? 'Сохранение...' : 'Сохранить' }}</button>
    </div>
  </form>
</div>
  `,
    styles: [`
    .card-form h3 { margin-top: 0; margin-bottom: 20px; }
.form-group { margin-bottom: 16px; display: flex; flex-direction: column; }
.form-group label { font-weight: 500; margin-bottom: 6px; }
input, textarea { padding: 8px 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 0.9rem; }
textarea { resize: vertical; }
.field-error { color: #d32f2f; font-size: 0.8rem; margin-top: 4px; }
.form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }
.btn-primary, .btn-secondary { border-radius: 20px; padding: 6px 20px; cursor: pointer; transition: 0.2s; }
.btn-primary { background: #8fd3fe; color: #2c3e50; border: none; }
.btn-primary:hover { background: #7bc2ed; transform: translateY(-1px); }
.btn-secondary { background: transparent; border: 1px solid #8fd3fe; color: #8fd3fe; }
.btn-secondary:hover { background: rgba(143,211,254,0.1); transform: translateY(-1px); }
  `]
})
export class MedicalCardFormComponent implements OnInit {
    private fb = inject(FormBuilder);

    @Input() editCard?: MedicalCard;
    @Output() success = new EventEmitter<{ visit_date: string; diagnosis: string }>();
    @Output() cancel = new EventEmitter<void>();

    loading = false;
    isEdit = false;

    cardForm = this.fb.group({
        visit_date: ['', Validators.required],
        diagnosis: ['', Validators.required]
    });

    ngOnInit(): void {
        if (this.editCard) {
            this.isEdit = true;
            this.cardForm.patchValue({
                visit_date: this.editCard.visit_date,
                diagnosis: this.editCard.diagnosis
            });
        }
    }

    onSubmit(): void {
        if (this.cardForm.invalid) return;
        this.loading = true;
        this.success.emit(this.cardForm.value as { visit_date: string; diagnosis: string });
    }

    onCancel(): void {
        this.cancel.emit();
    }
}