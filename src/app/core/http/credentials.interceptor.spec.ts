import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { credentialsInterceptor } from './credentials.interceptor';

describe('credentialsInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('deve adicionar withCredentials: true em requisição GET', () => {
    http.get('/api/test').subscribe();
    const req = controller.expectOne('/api/test');
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);
  });

  it('deve adicionar withCredentials: true em requisição POST', () => {
    http.post('/api/test', {}).subscribe();
    const req = controller.expectOne('/api/test');
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);
  });

  it('deve adicionar withCredentials: true em requisição PUT', () => {
    http.put('/api/test/1', {}).subscribe();
    const req = controller.expectOne('/api/test/1');
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);
  });

  it('deve adicionar withCredentials: true em requisição DELETE', () => {
    http.delete('/api/test/1').subscribe();
    const req = controller.expectOne('/api/test/1');
    expect(req.request.withCredentials).toBe(true);
    req.flush(null);
  });

  it('não deve alterar outras propriedades da requisição', () => {
    http.get('/api/test', { headers: { 'X-Custom': 'value' } }).subscribe();
    const req = controller.expectOne('/api/test');
    expect(req.request.headers.get('X-Custom')).toBe('value');
    req.flush(null);
  });
});
