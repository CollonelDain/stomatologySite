import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getAccessToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(authReq).pipe(
    catchError(error => {
      if (error.status === 401 && auth.getAccessToken()) {
        return auth.refreshToken().pipe(
          switchMap(() => {
            const newToken = auth.getAccessToken();
            if (newToken) {
              const retryReq = req.clone({
                headers: req.headers.set('Authorization', `Bearer ${newToken}`)
              });
              return next(retryReq);
            }
            return throwError(() => error);
          }),
          catchError(refreshError => {
            auth.logout().subscribe();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};