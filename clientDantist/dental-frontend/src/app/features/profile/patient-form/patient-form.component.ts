import { Component, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PatientService } from '../../../core/services/patient.service';

@Component({
  selector: 'app-patient-form',
  templateUrl: './patient-form.component.html',
  styleUrls: ['./patient-form.component.css'],
  standalone: false
})
export class PatientFormComponent {
  @Output() patientAdded = new EventEmitter<void>();
  patientForm: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private patientService: PatientService) {
    this.patientForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', Validators.email],
      phone: ['']
    });
  }

  onSubmit(): void {
    if (this.patientForm.invalid) return;
    this.loading = true;
    this.error = '';

    this.patientService.addPatient(this.patientForm.value).subscribe({
      next: () => {
        this.patientForm.reset();
        this.patientAdded.emit();
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.detail || 'Ошибка добавления';
        this.loading = false;
      }
    });
  }
}