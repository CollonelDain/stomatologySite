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
            url += `&visit_date=${visitDate}`;   // предполагаем, что бэкенд принимает такой параметр
        }
        return this.http.get<PaginatedMedicalCards>(url);
    }

    createCard(patientId: number, data: { visit_date: string; diagnosis: string }): Observable<MedicalCard> {
        return this.http.post<MedicalCard>(`${this.apiUrl}/patients/${patientId}/cards/`, data);
    }

    updateCard(patientId: number, cardId: number, data: { visit_date: string; diagnosis: string }): Observable<MedicalCard> {
        return this.http.put<MedicalCard>(`${this.apiUrl}/patients/${patientId}/cards/${cardId}/`, data);
    }

    deleteCard(patientId: number, cardId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/patients/${patientId}/cards/${cardId}/`);
    }
}