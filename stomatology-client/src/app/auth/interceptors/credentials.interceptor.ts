import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Интерцептор, добавляющий withCredentials: true ко всем HTTP-запросам.
 * Это необходимо для отправки HttpOnly cookie (сессионных или JWT в куках)
 * при кросс-доменных запросах.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const clonedReq = req.clone({ withCredentials: true });
  return next(clonedReq);
};