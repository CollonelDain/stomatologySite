// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { BehaviorSubject, Observable, throwError } from 'rxjs';
// import { tap, catchError } from 'rxjs/operators';
// import { User } from '../../models/user.model';
// import { environment } from '../../../environments/environment';

// interface AuthResponse {
//   user: User;
//   access: string;
//   refresh: string;
// }

// @Injectable({
//   providedIn: 'root'
// })
// export class AuthService {
//   private apiUrl = environment.apiUrl;
//   private userSubject = new BehaviorSubject<User | null>(null);
//   public user$ = this.userSubject.asObservable();

//   constructor(private http: HttpClient) {
//     const user = localStorage.getItem('user');
//     if (user) {
//       this.userSubject.next(JSON.parse(user));
//     }
//   }

//   login(email: string, password: string): Observable<AuthResponse> {
//     return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login/`, { email, password })
//       .pipe(
//         tap(response => {
//           this.setSession(response);
//         }),
//         catchError(this.handleError)
//       );
//   }

//   logout(): Observable<any> {
//     const refreshToken = localStorage.getItem('refresh_token');
//     return this.http.post(`${this.apiUrl}/auth/logout/`, { refresh_token: refreshToken })
//       .pipe(
//         tap(() => {
//           this.clearSession();
//         }),
//         catchError(error => {
//           this.clearSession();
//           return throwError(() => error);
//         })
//       );
//   }

//   refreshToken(): Observable<{ access: string }> {
//     const refresh = localStorage.getItem('refresh_token');
//     return this.http.post<{ access: string }>(`${this.apiUrl}/auth/token/refresh/`, { refresh })
//       .pipe(
//         tap(response => {
//           localStorage.setItem('access_token', response.access);
//         })
//       );
//   }

//   getProfile(): Observable<User> {
//     return this.http.get<User>(`${this.apiUrl}/auth/profile/`)
//       .pipe(
//         tap(user => {
//           this.userSubject.next(user);
//           localStorage.setItem('user', JSON.stringify(user));
//         })
//       );
//   }

//   updateProfile(data: Partial<User>): Observable<User> {
//     return this.http.patch<User>(`${this.apiUrl}/auth/profile/`, data)
//       .pipe(
//         tap(user => {
//           this.userSubject.next(user);
//           localStorage.setItem('user', JSON.stringify(user));
//         })
//       );
//   }

//   isAuthenticated(): boolean {
//     return !!localStorage.getItem('access_token');
//   }

//   getAccessToken(): string | null {
//     return localStorage.getItem('access_token');
//   }

//   private setSession(authResult: AuthResponse) {
//     localStorage.setItem('access_token', authResult.access);
//     localStorage.setItem('refresh_token', authResult.refresh);
//     localStorage.setItem('user', JSON.stringify(authResult.user));
//     this.userSubject.next(authResult.user);
//   }

//   private clearSession() {
//     localStorage.removeItem('access_token');
//     localStorage.removeItem('refresh_token');
//     localStorage.removeItem('user');
//     this.userSubject.next(null);
//   }

//   private handleError(error: any) {
//     console.error('Auth error', error);
//     return throwError(() => error);
//   }
// }



import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { User } from '../../models/user.model';
import { environment } from '../../../environments/environment';

interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$ = this.userSubject.asObservable();
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      const user = localStorage.getItem('user');
      if (user) {
        this.userSubject.next(JSON.parse(user));
      }
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login/`, { email, password })
      .pipe(
        tap(response => {
          this.setSession(response);
        }),
        catchError(this.handleError)
      );
  }

  logout(): Observable<any> {
    // На сервере просто чистим состояние без HTTP-запроса (или пропускаем)
    if (!this.isBrowser) {
      this.clearSession();
      return throwError(() => new Error('Logout called on server'));
    }

    const refreshToken = localStorage.getItem('refresh_token');
    return this.http.post(`${this.apiUrl}/auth/logout/`, { refresh_token: refreshToken })
      .pipe(
        tap(() => {
          this.clearSession();
        }),
        catchError(error => {
          this.clearSession();
          return throwError(() => error);
        })
      );
  }

  refreshToken(): Observable<{ access: string }> {
    if (!this.isBrowser) {
      return throwError(() => new Error('Refresh token called on server'));
    }

    const refresh = localStorage.getItem('refresh_token');
    return this.http.post<{ access: string }>(`${this.apiUrl}/auth/token/refresh/`, { refresh })
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
          this.userSubject.next(user);
          if (this.isBrowser) {
            localStorage.setItem('user', JSON.stringify(user));
          }
        })
      );
  }

  updateProfile(data: Partial<User>): Observable<User> {
  return this.http.patch<User>(`${this.apiUrl}/auth/profile/`, data).pipe(
    switchMap(() => this.getProfile()), // после патча вызываем getProfile
    tap(user => {
      this.userSubject.next(user);
      if (this.isBrowser) {
        localStorage.setItem('user', JSON.stringify(user));
      }
    })
  );
}
  isAuthenticated(): boolean {
    if (!this.isBrowser) {
      return false; // На сервере считаем, что не авторизован
    }
    return !!localStorage.getItem('access_token');
  }

  getAccessToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem('access_token');
  }

  private setSession(authResult: AuthResponse) {
    if (this.isBrowser) {
      localStorage.setItem('access_token', authResult.access);
      localStorage.setItem('refresh_token', authResult.refresh);
      localStorage.setItem('user', JSON.stringify(authResult.user));
    }
    this.userSubject.next(authResult.user);
  }

  private clearSession() {
    if (this.isBrowser) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
    this.userSubject.next(null);
  }

  private handleError(error: any) {
    console.error('Auth error', error);
    return throwError(() => error);
  }
}