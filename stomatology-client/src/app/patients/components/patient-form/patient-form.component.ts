// src/app/patients/components/patient-form/patient-form.component.ts

import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PatientsService } from '../../services/patients.service';
import { PatientCreateUpdate } from '../../../models';

@Component({
    selector: 'app-patient-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './patient-form.component.html',
    styleUrls: ['./patient-form.component.css']
})
export class PatientFormComponent implements OnInit {
    private fb = inject(FormBuilder);
    private patientsService = inject(PatientsService);

    @Input() editData?: PatientCreateUpdate & { id?: number };
    @Output() success = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    loading = false;
    errorMessage: string | null = null;
    isEdit = false;

    patientForm = this.fb.group({
        patient_code: ['', Validators.required],
        // first_name: ['', Validators.required],
        // last_name: ['', Validators.required],
        // middle_name: [''],
        // email: ['', Validators.email],
        // phone: [''],
        // date_of_birth: ['']
    });

    ngOnInit(): void {
        if (this.editData && this.editData.id) {
            this.isEdit = true;
            this.patientForm.patchValue({
                patient_code: this.editData.patient_code,
                // first_name: this.editData.first_name,
                // last_name: this.editData.last_name,
                // middle_name: this.editData.middle_name || '',
                // email: this.editData.email || '',
                // phone: this.editData.phone || '',
                // date_of_birth: this.editData.date_of_birth || ''
            });
        }
    }

    onSubmit(): void {
        if (this.patientForm.invalid) return;
        this.loading = true;
        this.errorMessage = null;

        const formValue = this.patientForm.value;
        const payload: PatientCreateUpdate = {
            patient_code: formValue.patient_code!,
            // first_name: formValue.first_name!,
            // last_name: formValue.last_name!,
            // middle_name: formValue.middle_name || null,
            // email: formValue.email || null,
            // phone: formValue.phone || null,
            // date_of_birth: formValue.date_of_birth || null
        };

        const request$ = this.isEdit && this.editData?.id
            ? this.patientsService.updatePatient(this.editData.id, payload)
            : this.patientsService.createPatient(payload);

        request$.subscribe({
            next: () => {
                this.success.emit();
            },
            error: (err) => {
                this.loading = false;
                this.errorMessage = err.error?.detail || 'Ошибка при сохранении пациента';
            }
        });
    }

    onCancel(): void {
        this.cancel.emit();
    }
}