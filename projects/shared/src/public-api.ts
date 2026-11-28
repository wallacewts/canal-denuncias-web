/*
 * API pública da lib compartilhada entre o portal e o backoffice.
 */
export * from './lib/config/app-config';
export * from './lib/http/api.interceptor';
export * from './lib/http/api-policy';
export * from './lib/http/credentials.interceptor';
export * from './lib/http/provide-api';
export { API_CALLER_HANDLES } from './lib/http/error.interceptor';
export * from './lib/ui/page-placeholder';
export * from './lib/session/reporter-session';
export * from './lib/ui/sensitive-input.directive';
export * from './lib/http/api-error';
export * from './lib/notifications/notification.service';
export * from './lib/errors/app-error-handler';
export * from './lib/i18n/provide-locale';
export * from './lib/pipes/portal-date.pipe';
export * from './lib/pipes/staff-date-time.pipe';
export * from './lib/ui/page-header';
export * from './lib/ui/empty-state';
export * from './lib/ui/loading-state';
export * from './lib/ui/confirm-dialog';
export * from './lib/ui/status-chip';
export * from './lib/ui/form-field-error';
export * from './lib/state/screen-state';
export * from './lib/pipes/format-date';
