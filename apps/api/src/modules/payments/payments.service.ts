import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { PaymentInput } from '@sokoos/shared';
import { v4 as uuid } from 'uuid';

/** Uganda has a fixed UTC+3 offset (no DST). */
const KAMPALA_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

function kampalaDayRange(businessDate: string): { start: Date; end: Date } {
  const start = new Date(`${businessDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    throw new BadRequestException({ code: 'INVALID_DATE', message: 'Invalid business date' });
  }
  const startUtc = new Date(start.getTime() - KAMPALA_OFFSET_MS);
  return { start: startUtc, end: new Date(startUtc.getTime() + DAY_MS) };
}

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async initiatePayment(businessId: string, input: PaymentInput) {
    // Idempotency keys are tenant-scoped: another tenant's key must never leak a payment.
    const existing = await this.prisma.payment.findFirst({
      where: { businessId, idempotencyKey: input.idempotencyKey },
    });
    if (existing) return existing;

    const sale = await this.prisma.sale.findFirst({
      where: { id: input.saleId, businessId, status: 'COMPLETED' },
    });
    if (!sale) throw new NotFoundException('Sale not found');

    const paid = await this.prisma.payment.aggregate({
      where: {
        businessId,
        saleId: input.saleId,
        status: { in: ['SUCCEEDED', 'PENDING'] },
      },
      _sum: { amountMinor: true },
    });
    const outstanding = sale.totalMinor - (paid._sum.amountMinor ?? 0n);
    if (input.amountMinor > outstanding) {
      throw new BadRequestException({
        code: 'PAYMENT_EXCEEDS_BALANCE',
        message: `Payment exceeds the outstanding balance of ${outstanding}`,
      });
    }

    if (input.method === 'CASH') {
      const tendered = input.amountTenderedMinor ?? input.amountMinor;
      if (tendered < input.amountMinor) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_TENDER',
          message: 'Cash tendered is less than the amount due',
        });
      }

      return this.prisma.payment.create({
        data: {
          businessId,
          saleId: input.saleId,
          method: 'CASH',
          status: 'SUCCEEDED',
          idempotencyKey: input.idempotencyKey,
          amountMinor: input.amountMinor,
          amountTenderedMinor: tendered,
          changeMinor: tendered > input.amountMinor ? tendered - input.amountMinor : null,
          currency: input.currency,
          succeededAt: new Date(),
        },
      });
    }

    // Mobile money requires a provider callback. Until an integration is configured and its
    // webhook verifies the provider event, payments must stay PENDING — never auto-succeed.
    const providerConfigured =
      input.method === 'MTN_MOMO'
        ? !!process.env.MTN_MOMO_SUBSCRIPTION_KEY
        : !!(process.env.AIRTEL_MONEY_CLIENT_ID && process.env.AIRTEL_MONEY_CLIENT_SECRET);
    if (!providerConfigured) {
      throw new ServiceUnavailableException({
        code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
        message: 'Mobile money is not configured for this business. Use cash or contact support.',
      });
    }

    const expiresAt = new Date(Date.now() + 10 * 60_000);
    return this.prisma.payment.create({
      data: {
        businessId,
        saleId: input.saleId,
        method: input.method,
        status: 'PENDING',
        idempotencyKey: input.idempotencyKey,
        providerReference: uuid(),
        amountMinor: input.amountMinor,
        currency: input.currency,
        expiresAt,
      },
    });
  }

  async getStatus(businessId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, businessId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async listPayments(
    businessId: string,
    filters: { saleId?: string; method?: string; status?: string; page?: number; limit?: number },
  ) {
    const { page = 1, limit = 25, saleId, method, status } = filters;
    const where = {
      businessId,
      ...(saleId && { saleId }),
      ...(method && { method: method as never }),
      ...(status && { status: status as never }),
    };
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async closeDaySession(
    businessId: string,
    userId: string,
    branchId: string,
    businessDate: string,
    countedCashMinor: bigint,
    denominations: unknown[],
    discrepancyReason?: string,
  ) {
    void denominations; // stored in the cash session, not the immutable day-closure row
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, businessId, deletedAt: null },
      select: { id: true },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    const storedDate = new Date(`${businessDate}T00:00:00.000Z`);
    const existing = await this.prisma.dayClosure.findFirst({
      where: { businessId, branchId, businessDate: storedDate },
    });
    if (existing) {
      throw new ConflictException({
        code: 'DAY_ALREADY_CLOSED',
        message: 'This business date is already closed',
      });
    }

    const { start, end } = kampalaDayRange(businessDate);
    const cashSales = await this.prisma.payment.aggregate({
      where: {
        businessId,
        method: 'CASH',
        status: 'SUCCEEDED',
        createdAt: { gte: start, lt: end },
        sale: { branchId },
      },
      _sum: { amountMinor: true },
    });
    const expectedCashMinor = cashSales._sum.amountMinor ?? 0n;
    const discrepancyMinor = countedCashMinor - expectedCashMinor;

    if (discrepancyMinor !== 0n && !discrepancyReason?.trim()) {
      throw new BadRequestException({
        code: 'DISCREPANCY_REASON_REQUIRED',
        message: 'A reason is required when counted cash differs from expected cash',
      });
    }

    return this.prisma.dayClosure.create({
      data: {
        businessId,
        branchId,
        businessDate: storedDate,
        expectedCashMinor,
        countedCashMinor,
        discrepancyMinor,
        discrepancyReason: discrepancyReason?.trim(),
        closedBy: userId,
      },
    });
  }
}
