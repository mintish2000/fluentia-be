import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PaymentEntity } from '../entities/payment.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Payment } from '../../../../domain/payment';
import { PaymentRepository } from '../../payment.repository';
import { PaymentMapper } from '../mappers/payment.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class PaymentRelationalRepository implements PaymentRepository {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
  ) {}

  async create(data: Payment): Promise<Payment> {
    const persistenceModel = PaymentMapper.toPersistence(data);
    const newEntity = await this.paymentRepository.save(
      this.paymentRepository.create(persistenceModel),
    );
    return PaymentMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Payment[]> {
    const entities = await this.paymentRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => PaymentMapper.toDomain(entity));
  }

  async findById(id: Payment['id']): Promise<NullableType<Payment>> {
    const entity = await this.paymentRepository.findOne({
      where: { id },
    });

    return entity ? PaymentMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Payment['id'][]): Promise<Payment[]> {
    const entities = await this.paymentRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => PaymentMapper.toDomain(entity));
  }

  async findByProviderReference(
    providerReference: string,
  ): Promise<Payment | null> {
    const entity = await this.paymentRepository.findOne({
      where: { providerReference },
      loadEagerRelations: false,
    });
    return entity ? PaymentMapper.toDomain(entity) : null;
  }

  async findByStudentId(
    studentId: number,
    paginationOptions: IPaginationOptions,
  ): Promise<Payment[]> {
    const entities = await this.paymentRepository.find({
      where: { studentId } as any,
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      order: {
        createdAt: 'DESC',
      },
      /** Avoid eager-loading the same student row on every payment row. */
      loadEagerRelations: false,
    });

    return entities.map((entity) => PaymentMapper.toDomain(entity));
  }

  async findAllByStudentId(studentId: number): Promise<Payment[]> {
    const entities = await this.paymentRepository.find({
      where: { studentId } as any,
      order: { paidAt: 'DESC', createdAt: 'DESC' },
      loadEagerRelations: false,
    });

    return entities.map((entity) => PaymentMapper.toDomain(entity));
  }

  async findAllByStudentIds(studentIds: number[]): Promise<Payment[]> {
    if (!studentIds.length) return [];
    const entities = await this.paymentRepository.find({
      where: { studentId: In(studentIds) } as any,
      order: { paidAt: 'DESC', createdAt: 'DESC' },
      loadEagerRelations: false,
    });

    return entities.map((entity) => PaymentMapper.toDomain(entity));
  }

  async getRevenueGroupedByMonth(): Promise<
    Array<{ month: string; totalAmount: number }>
  > {
    const rows = await this.paymentRepository
      .createQueryBuilder('p')
      .select("TO_CHAR(p.paidAt, 'YYYY-MM')", 'month')
      .addSelect('SUM(p.amount)', 'totalAmount')
      .where('p.paidAt IS NOT NULL')
      .groupBy("TO_CHAR(p.paidAt, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string; totalAmount: string }>();

    return rows.map((r) => ({
      month: r.month,
      totalAmount: Number(r.totalAmount),
    }));
  }

  async update(id: Payment['id'], payload: Partial<Payment>): Promise<Payment> {
    const entity = await this.paymentRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.paymentRepository.save(
      this.paymentRepository.create(
        PaymentMapper.toPersistence({
          ...PaymentMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return PaymentMapper.toDomain(updatedEntity);
  }

  async remove(id: Payment['id']): Promise<void> {
    await this.paymentRepository.delete(id);
  }
}
