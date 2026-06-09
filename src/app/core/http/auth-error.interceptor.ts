import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (req.url.includes('/users/refresh')) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        if (!auth.isAuthenticated()) {
          return throwError(() => error);
        }
        return auth.refresh().pipe(
          switchMap(() => next(req.clone({ withCredentials: true }))),
          catchError(() => {
            auth.clearSession();
            router.navigate(['/login']);
            return throwError(() => error);
          }),
        );
      }
      if (error.status === 403) {
        router.navigate(['/unauthorized']);
        return throwError(() => error);
      }
      return throwError(() => error);
    }),
  );
};
