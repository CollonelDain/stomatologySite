// src/app/auth/services/auth.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { User, UserProfileUpdate } from '../../models/user.model';
import { environment } from '../../../environments/environment';

interface LoginResponse {
  user: User;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    // Не восстанавливаем пользователя из localStorage – полагаемся на сервер.
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login/`, { email, password })
      .pipe(
        tap(response => this.currentUserSubject.next(response.user)),
        map(response => response.user),
        catchError(err => throwError(() => err))
      );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/logout/`, {})
      .pipe(
        tap(() => this.currentUserSubject.next(null)),
        catchError(err => {
          this.currentUserSubject.next(null);
          return throwError(() => err);
        })
      );
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/profile/`)
      .pipe(
        tap(user => this.currentUserSubject.next(user)),
        catchError(err => throwError(() => err))
      );
  }

  // 👇 ДОБАВЛЯЕМ МЕТОД ОБНОВЛЕНИЯ ПРОФИЛЯ
  updateProfile(data: UserProfileUpdate): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/auth/profile/`, data)
      .pipe(
        tap(user => this.currentUserSubject.next(user)),
        catchError(err => throwError(() => err))
      );
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }
}