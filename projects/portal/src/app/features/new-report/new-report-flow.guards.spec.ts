import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, isObservable, of, type Observable } from 'rxjs';
import { leaveFlowGuard, leaveProtocolGuard } from './new-report-flow.guards';
import type { NewReportFlow } from './new-report-flow';
import type { ProtocolIssuedPage } from './protocol-issued-page';

const route = {} as ActivatedRouteSnapshot;
const state = (url: string) => ({ url }) as RouterStateSnapshot;

async function resolve(result: unknown): Promise<unknown> {
  return isObservable(result) ? firstValueFrom(result as Observable<unknown>) : result;
}

describe('leaveFlowGuard', () => {
  it('navegação dentro do fluxo passa sem perguntar', async () => {
    const flow = { confirmLeave: vi.fn(() => of(false)) } as unknown as NewReportFlow;
    expect(
      await resolve(
        leaveFlowGuard(flow, route, state('/nova-denuncia/tipo'), state('/nova-denuncia/relato')),
      ),
    ).toBe(true);
    expect(flow.confirmLeave).not.toHaveBeenCalled();
  });

  it('para fora do fluxo, decide pela confirmação', async () => {
    const flow = { confirmLeave: vi.fn(() => of(false)) } as unknown as NewReportFlow;
    expect(
      await resolve(leaveFlowGuard(flow, route, state('/nova-denuncia/tipo'), state('/ajuda'))),
    ).toBe(false);
    expect(flow.confirmLeave).toHaveBeenCalled();
  });
});

describe('leaveProtocolGuard', () => {
  it('delega para a tela, que pergunta enquanto houver comprovante', async () => {
    const page = { canLeave: vi.fn(() => of(false)) } as unknown as ProtocolIssuedPage;
    expect(
      await resolve(
        leaveProtocolGuard(
          page,
          route,
          state('/nova-denuncia/protocolo'),
          state('/nova-denuncia/revisao'),
        ),
      ),
    ).toBe(false);
    expect(page.canLeave).toHaveBeenCalled();
  });
});
