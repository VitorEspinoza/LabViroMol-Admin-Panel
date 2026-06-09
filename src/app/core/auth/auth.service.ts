import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  refresh(): Observable<void> {
    return EMPTY;
  }

  clearSession(): void {}
}
