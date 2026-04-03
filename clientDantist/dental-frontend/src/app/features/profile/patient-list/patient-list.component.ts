import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Patient } from '../../../models/patient.model';
import { PatientService } from '../../../core/services/patient.service';

@Component({
  selector: 'app-patient-list',
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.css'],
  standalone: false
})
export class PatientListComponent {
  @Input() patients: Patient[] = [];
  @Input() loading = false;
  @Output() refresh = new EventEmitter<void>();

  editPatient: Patient | null = null;
  editForm: any = {};

  constructor(private patientService: PatientService) { }

  startEdit(patient: Patient): void {
    this.editPatient = { ...patient };
    this.editForm = { ...patient };
  }

  cancelEdit(): void {
    this.editPatient = null;
  }

  saveEdit(): void {
    if (this.editPatient) {
      this.patientService.updatePatient(this.editPatient.id, this.editForm).subscribe({
        next: () => {
          this.editPatient = null;
          this.refresh.emit();
        },
        error: (err) => {
          console.error(err);
        }
      });
    }
  }

  deletePatient(id: number): void {
    if (confirm('Удалить пациента?')) {
      this.patientService.deletePatient(id).subscribe({
        next: () => {
          this.refresh.emit();
        },
        error: (err) => {
          console.error(err);
        }
      });
    }
  }
}