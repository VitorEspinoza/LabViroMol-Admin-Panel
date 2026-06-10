import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PermissionsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getPermissions — retorna lista de strings de permissões', () => {
    const permissions = [
      'Identity.Users.View',
      'Identity.Users.Manage',
      'Identity.Roles.View',
      'Identity.Roles.Manage',
    ];

    service.getPermissions().subscribe(res => {
      expect(res).toEqual(permissions);
      expect(res.length).toBe(4);
    });

    const req = http.expectOne('http://localhost:5085/api/identity/permissions');
    expect(req.request.method).toBe('GET');
    req.flush(permissions);
  });

  it('getPermissions — retorna lista vazia sem erro', () => {
    service.getPermissions().subscribe(res => expect(res).toEqual([]));
    http.expectOne('http://localhost:5085/api/identity/permissions').flush([]);
  });
});
