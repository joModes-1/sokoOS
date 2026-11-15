import { AuthService } from '../auth.service.js';

describe('AuthService login status', () => {
  function build(status: string): { service: AuthService; prisma: { user: { findFirst: jest.Mock } } } {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          status,
          passwordHash: 'hash',
          failedLoginCount: 0,
          lockedUntil: null,
          mfaEnabled: false,
        }),
      },
    };
    const jwt = { sign: jest.fn() };
    const config = { get: jest.fn() };
    const audit = { logAuthEvent: jest.fn().mockResolvedValue(undefined) };
    const mailer = { sendVerificationCode: jest.fn().mockResolvedValue(true), send: jest.fn().mockResolvedValue(true) };
    return {
      service: new AuthService(prisma as never, jwt as never, config as never, audit as never, mailer as never),
      prisma,
    };
  }

  it.each(['SUSPENDED', 'DELETED'])('rejects %s accounts before checking the password', async (status) => {
    const { service } = build(status);

    await expect(
      service.login({ email: 'user@example.com', password: 'Password1', rememberMe: false }),
    ).rejects.toMatchObject({ response: { code: 'ACCOUNT_SUSPENDED' } });
  });

  it('rejects an unknown email as UNAUTHENTICATED, not an internal error', async () => {
    const { service, prisma } = build('ACTIVE');
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.login({ email: 'nobody@example.com', password: 'Password1', rememberMe: false }),
    ).rejects.toMatchObject({ response: { code: 'UNAUTHENTICATED' } });
  });
});
