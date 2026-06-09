import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { RolesService } from './roles.service';
import { Role, CreateRoleRequest } from '../../../shared/models/role.model';

const mockRole: Role = {
  roleId: 'r1',
  name: 'Admin',
  permissions: ['Identity.Users.View', 'Identity.Users.Manage'],
};

describe('RolesService', () => {
  let service: RolesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RolesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getRoles — retorna array de roles com permissões', () => {
    service.getRoles().subscribe(roles => {
      expect(roles.length).toBe(1);
      expect(roles[0].roleId).toBe('r1');
      expect(roles[0].permissions).toContain('Identity.Users.View');
    });

    const req = http.expectOne('/api/identity/roles');
    expect(req.request.method).toBe('GET');
    req.flush([mockRole]);
  });

  it('getRoles — retorna lista vazia sem erro', () => {
    service.getRoles().subscribe(roles => expect(roles).toEqual([]));
    http.expectOne('/api/identity/roles').flush([]);
  });

  it('createRole — envia POST e retorna role criada', () => {
    const body: CreateRoleRequest = {
      name: 'Viewer',
      permissions: ['Identity.Users.View'],
    };

    service.createRole(body).subscribe(role => {
      expect(role.roleId).toBe('r2');
      expect(role.name).toBe('Viewer');
    });

    const req = http.expectOne('/api/identity/roles');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ roleId: 'r2', name: 'Viewer', permissions: ['Identity.Users.View'] });
  });

  it('createRole — aceita lista de permissões vazia', () => {
    const body: CreateRoleRequest = { name: 'Empty', permissions: [] };

    service.createRole(body).subscribe();

    const req = http.expectOne('/api/identity/roles');
    expect(req.request.body.permissions).toEqual([]);
    req.flush({ roleId: 'r3', name: 'Empty', permissions: [] });
  });
});
