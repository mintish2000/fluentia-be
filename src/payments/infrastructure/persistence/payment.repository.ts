import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Payment } from '../../domain/payment';

export abstract class PaymentRepository {
  abstract create(
    data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Payment>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Payment[]>;

  abstract findById(id: Payment['id']): Promise<NullableType<Payment>>;

  abstract findByIds(ids: Payment['id'][]): Promise<Payment[]>;

  abstract findByProviderReference(
    providerReference: string,
  ): Promise<NullableType<Payment>>;

  abstract findByStudentId(
    studentId: number,
    paginationOptions: IPaginationOptions,
  ): Promise<Payment[]>;

  /**
   * All payments for a student (admin roster / profile).
   */
  abstract findAllByStudentId(studentId: number): Promise<Payment[]>;

  /**
   * Batch variant: all payments for multiple students in a single query.
   * Returned payments include `studentId` raw FK for grouping.
   */
  abstract findAllByStudentIds(studentIds: number[]): Promise<Payment[]>;

  /**
   * Revenue aggregated by month (YYYY-MM) — avoids loading every payment row.
   */
  abstract getRevenueGroupedByMonth(): Promise<
    Array<{ month: string; totalAmount: number }>
  >;

  abstract update(
    id: Payment['id'],
    payload: DeepPartial<Payment>,
  ): Promise<Payment | null>;

  abstract remove(id: Payment['id']): Promise<void>;
}
