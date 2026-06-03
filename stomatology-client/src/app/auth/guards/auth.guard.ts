import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export const authGuard = (): Observable<boolean> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Страница логина всегда доступна
  if (router.url === '/login') {
    return of(true);
  }

  // Пытаемся загрузить профиль – сервер проверит куку.
  // Если кука валидна, вернёт пользователя; иначе – 401.
  return auth.getProfile().pipe(
    map(() => true),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    })
  );
};