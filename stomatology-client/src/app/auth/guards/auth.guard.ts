import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export const authGuard = (): Observable<boolean> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (router.url === '/login') {
    return of(true);
  }

  return auth.getProfile().pipe(
    map(() => true),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    })
  );
};