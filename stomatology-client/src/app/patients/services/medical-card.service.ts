import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { MedicalCard, PaginatedMedicalCards } from "../../models";
import { Observable } from "rxjs";

@Injectable({ providedIn: 'root' })
export class MedicalCardsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getCards(patientId: number, page: number = 1, visitDate?: string): Observable<PaginatedMedicalCards> {
    let url = `${this.apiUrl}/patients/${patientId}/cards/?page=${page}`;
    if (visitDate) {
      url += `&visit_date=${visitDate}`;
    }
    return this.http.get<PaginatedMedicalCards>(url);
  }

  getCard(patientId: number, cardId: number): Observable<MedicalCard> {
    return this.http.get<MedicalCard>(`${this.apiUrl}/patients/${patientId}/cards/${cardId}/`);
  }

  createCard(patientId: number, data: Omit<MedicalCard, 'id' | 'created_at' | 'updated_at'>): Observable<MedicalCard> {
    return this.http.post<MedicalCard>(`${this.apiUrl}/patients/${patientId}/cards/`, data);
  }

  updateCard(patientId: number, cardId: number, data: Partial<MedicalCard>): Observable<MedicalCard> {
    return this.http.put<MedicalCard>(`${this.apiUrl}/patients/${patientId}/cards/${cardId}/`, data);
  }

  deleteCard(patientId: number, cardId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/patients/${patientId}/cards/${cardId}/`);
  }
}