import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { TokenRefreshResponse, User, UserProfileUpdate } from '../../models/user.model';
import { environment } from '../../../environments/environment';

interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    const user = localStorage.getItem('user');
    if (user) {
      this.currentUserSubject.next(JSON.parse(user));
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login/`, { email, password })
      .pipe(
        tap(response => this.setSession(response)),
        catchError(err => throwError(() => err))
      );
  }

  logout(): Observable<any> {
    const refreshToken = localStorage.getItem('refresh_token');
    return this.http.post(`${this.apiUrl}/auth/logout/`, { refresh_token: refreshToken })
      .pipe(
        tap(() => this.clearSession()),
        catchError(err => {
          this.clearSession();
          return throwError(() => err);
        })
      );
  }

  refreshToken(): Observable<TokenRefreshResponse> {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) {
      return throwError(() => new Error('No refresh token'));
    }
    return this.http.post<TokenRefreshResponse>(`${this.apiUrl}/auth/token/refresh/`, { refresh })
      .pipe(
        tap(response => {
          localStorage.setItem('access_token', response.access);
        })
      );
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/profile/`)
      .pipe(
        tap(user => {
          this.currentUserSubject.next(user);
          localStorage.setItem('user', JSON.stringify(user));
        })
      );
  }

  updateProfile(data: UserProfileUpdate): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/auth/profile/`, data)
      .pipe(
        tap(user => {
          this.currentUserSubject.next(user);
          localStorage.setItem('user', JSON.stringify(user));
        })
      );
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private setSession(authResult: AuthResponse) {
    localStorage.setItem('access_token', authResult.access);
    localStorage.setItem('refresh_token', authResult.refresh);
    localStorage.setItem('user', JSON.stringify(authResult.user));
    this.currentUserSubject.next(authResult.user);
  }

  private clearSession() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }
}