import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { UsersService } from './users.service';
import { CreateUserRequest, CreateUserResponse, UpdateUserRequest } from '../../../shared/models/user.model';
import { PagedResponse } from '../../../shared/models/pagination.model';

const mockApiUserSummary = {
  id: 'u1',
  fullName: 'Ana Silva',
  email: 'ana@example.com',
  isActive: true,
  roles: ['Admin'],
};

const mockApiUserProfile = {
  id: 'u1',
  userData: {
    firstName: 'Ana',
    lastName: 'Silva',
    phoneNumber: null,
    emergencyContactName: null,
    emergencyContactNumber: null,
  },
  isActive: true,
  roles: ['Admin'],
};

describe('UsersService', () => {
  let service: UsersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UsersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getUsers — mapeia id para userId e mantém paginação', () => {
    const response: PagedResponse<typeof mockApiUserSummary> = {
      data: [mockApiUserSummary],
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 1,
    };

    service.getUsers({ pageNumber: 1, pageSize: 10 }).subscribe(res => {
      expect(res.data.length).toBe(1);
      expect(res.data[0].userId).toBe('u1');
      expect(res.data[0].fullName).toBe('Ana Silva');
      expect(res.data[0].email).toBe('ana@example.com');
      expect(res.totalCount).toBe(1);
    });

    const req = http.expectOne(r => r.url === 'http://localhost:5085/api/identity/users');
    expect(req.request.params.get('pageNumber')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    req.flush(response);
  });

  it('getUserById — mapeia id para userId e achata userData', () => {
    service.getUserById('u1').subscribe(user => {
      expect(user.userId).toBe('u1');
      expect(user.firstName).toBe('Ana');
      expect(user.lastName).toBe('Silva');
      expect(user.roles).toEqual(['Admin']);
    });

    http.expectOne('http://localhost:5085/api/identity/users/u1').flush(mockApiUserProfile);
  });

  it('createUser — retorna userId e resetToken', () => {
    const body: CreateUserRequest = {
      firstName: 'Ana',
      lastName: 'Silva',
      email: 'ana@example.com',
    };
    const responseBody: CreateUserResponse = { userId: 'u1', resetToken: 'tok123' };

    service.createUser(body).subscribe(res => {
      expect(res.userId).toBe('u1');
      expect(res.resetToken).toBe('tok123');
    });

    const req = http.expectOne('http://localhost:5085/api/identity/users');
    expect(req.request.method).toBe('POST');
    req.flush(responseBody);
  });

  it('createUser — propaga erro 400 (campos inválidos)', () => {
    const body: CreateUserRequest = { firstName: '', lastName: '', email: 'bad' };
    let caught = false;

    service.createUser(body).subscribe({
      error: err => {
        expect(err.status).toBe(400);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/identity/users').flush(
      { errors: { email: ['Email inválido.'] } },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(caught).toBe(true);
  });

  it('createUser — propaga erro 409 (e-mail duplicado)', () => {
    const body: CreateUserRequest = { firstName: 'Ana', lastName: 'Silva', email: 'ana@example.com' };
    let caught = false;

    service.createUser(body).subscribe({
      error: err => {
        expect(err.status).toBe(409);
        caught = true;
      },
    });

    http.expectOne('http://localhost:5085/api/identity/users').flush(
      { error: 'E-mail já está em uso.' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(caught).toBe(true);
  });

  it('updateUser — envia PUT com corpo correto', () => {
    const body: UpdateUserRequest = {
      firstName: 'Ana',
      lastName: 'Costa',
      email: 'ana@example.com',
      roleIds: ['r1'],
    };

    service.updateUser('u1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/identity/users/u1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.roleIds).toEqual(['r1']);
    req.flush(null);
  });

  it('updateUser — aceita roleIds vazio', () => {
    const body: UpdateUserRequest = {
      firstName: 'Ana',
      lastName: 'Costa',
      email: 'ana@example.com',
      roleIds: [],
    };

    service.updateUser('u1', body).subscribe();

    const req = http.expectOne('http://localhost:5085/api/identity/users/u1');
    expect(req.request.body.roleIds).toEqual([]);
    req.flush(null);
  });

  it('deactivateUser — envia POST para /deactivate', () => {
    service.deactivateUser('u1').subscribe();

    const req = http.expectOne('http://localhost:5085/api/identity/users/u1/deactivate');
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('reactivateUser — envia POST para /reactivate', () => {
    service.reactivateUser('u1').subscribe();

    const req = http.expectOne('http://localhost:5085/api/identity/users/u1/reactivate');
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });
});
