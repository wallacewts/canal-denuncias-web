import { TestBed } from '@angular/core/testing';
import { ApiConfiguration as PublicApiConfiguration } from '../api/generated/public/api-configuration';
import { APP_CONFIG } from '../config/app-config';
import { API_POLICY, type ApiPolicy } from './api-policy';
import { provideApi } from './provide-api';

describe('provideApi', () => {
  it('registra a configuração e a política de credenciais do app', () => {
    const policy: ApiPolicy = {
      audience: 'portal',
      withCredentials: false,
      bearerFor: '/public/v1/me/',
      onUnauthenticated: () => undefined,
    };
    TestBed.configureTestingModule({ providers: [provideApi({ apiBaseUrl: '/api' }, policy)] });

    expect(TestBed.inject(APP_CONFIG)).toEqual({ apiBaseUrl: '/api' });
    expect(TestBed.inject(API_POLICY)).toBe(policy);
    expect(TestBed.inject(PublicApiConfiguration).rootUrl).toBe('api:');
  });
});
