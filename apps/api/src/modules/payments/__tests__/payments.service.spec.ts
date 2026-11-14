import { PaymentsService } from '../payments.service.js';
import type { PaymentInput } from '@sokoos/shared';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: {
    payment: { findFirst: jest.Mock; create: jest.Mock; aggregate: jest.Mock };
    sale: { findFirst: jest.Mock };
  };

  const input: PaymentInput = {
    saleId: 'sale-1',
    idempotencyKey: 'key-1',
    method: 'MTN_MOMO',
    amountMinor: 1000n,
    phoneNumber: '+256700000000',
    currency: 'UGX',
  };

  beforeEach(() => {
    prisma = {
      payment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amountMinor: 0n } }),
      },
      sale: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'sale-1',
          totalMinor: 1000n,
          status: 'COMPLETED',
        }),
      },
    };
    service = new PaymentsService(prisma as never);
  });

  it('looks up idempotency keys within the tenant', async () => {
    process.env.MTN_MOMO_SUBSCRIPTION_KEY = '';
    try {
      await service.initiatePayment('biz-1', input).catch(() => undefined);
    } finally {
      delete process.env.MTN_MOMO_SUBSCRIPTION_KEY;
    }

    expect(prisma.payment.findFirst).toHaveBeenCalledWith({
      where: { businessId: 'biz-1', idempotencyKey: 'key-1' },
    });
  });

  it('never fabricates a successful mobile-money payment', async () => {
    delete process.env.MTN_MOMO_SUBSCRIPTION_KEY;

    await expect(service.initiatePayment('biz-1', input)).rejects.toMatchObject({
      response: { code: 'PAYMENT_PROVIDER_NOT_CONFIGURED' },
    });
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects a payment above the outstanding sale balance', async () => {
    await expect(
      service.initiatePayment('biz-1', { ...input, amountMinor: 2000n }),
    ).rejects.toMatchObject({ response: { code: 'PAYMENT_EXCEEDS_BALANCE' } });
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects cash tendered below the amount due', async () => {
    await expect(
      service.initiatePayment('biz-1', {
        ...input,
        method: 'CASH',
        amountTenderedMinor: 500n,
      }),
    ).rejects.toMatchObject({ response: { code: 'INSUFFICIENT_TENDER' } });
  });
});
