import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PatientCreateUpdate, PatientDetail, PatientsList } from '../../models';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

@Injectable({ providedIn: 'root' })
export class PatientsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/patients/`;

  getPatientsPage(page: number = 1, search: string = ''): Observable<PaginatedResponse<PatientsList>> {
    let url = `${this.baseUrl}?page=${page}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    return this.http.get<PaginatedResponse<PatientsList>>(url).pipe(
      map(response => ({
        ...response,
        results: response.results.map(p => ({
          ...p,
          date_of_birth: p.date_of_birth ? new Date(p.date_of_birth) : null,
          last_visit: p.last_visit ? new Date(p.last_visit) : null,
          created_at: new Date(p.created_at)
        }))
      }))
    );
  }

  getPatients(): Observable<PatientsList[]> {
    return this.getPatientsPage(1).pipe(map(res => res.results));
  }

  getPatientById(id: number): Observable<PatientDetail> {
    return this.http.get<PatientDetail>(`${this.baseUrl}${id}/`).pipe(
      map(patient => ({
        ...patient,
        date_of_birth: patient.date_of_birth ? new Date(patient.date_of_birth) : null,
        created_at: new Date(patient.created_at),
        updated_at: new Date(patient.updated_at)
      }))
    );
  }

  createPatient(data: PatientCreateUpdate): Observable<PatientsList> {
    return this.http.post<PatientsList>(this.baseUrl, data);
  }

  updatePatient(id: number, data: PatientCreateUpdate): Observable<PatientsList> {
    return this.http.put<PatientsList>(`${this.baseUrl}${id}/`, data);
  }
}