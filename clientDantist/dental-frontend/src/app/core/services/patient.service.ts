import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Patient } from '../../models/patient.model';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  constructor(private api: ApiService) { }

  getPatients(search?: string): Observable<Patient[]> {
    const params = search ? { search } : {};
    return this.api.get<Patient[]>('/patients/', params);
  }

  addPatient(patient: Partial<Patient>): Observable<Patient> {
    return this.api.post<Patient>('/patients/', patient);
  }

  updatePatient(id: number, patient: Partial<Patient>): Observable<Patient> {
    return this.api.patch<Patient>(`/patients/${id}/`, patient);
  }

  deletePatient(id: number): Observable<void> {
    return this.api.delete<void>(`/patients/${id}/`);
  }
}