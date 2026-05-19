import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PlacementEntity } from '../entities/placement.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Placement } from '../../../../domain/placement';
import { PlacementRepository } from '../../placement.repository';
import { PlacementMapper } from '../mappers/placement.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class PlacementRelationalRepository implements PlacementRepository {
  /** In-memory cache for the placement test row (TTL: 5 minutes). */
  private _placementTestCache: { data: Placement; expiresAt: number } | null =
    null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(
    @InjectRepository(PlacementEntity)
    private readonly placementRepository: Repository<PlacementEntity>,
  ) {}

  async create(
    data: Omit<Placement, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Placement> {
    const merged = Object.assign(new Placement(), data, {
      questions: data.questions ?? [],
    }) as Placement;
    const persistenceModel = PlacementMapper.toPersistence(merged);
    const newEntity = await this.placementRepository.save(
      this.placementRepository.create(persistenceModel),
    );
    return PlacementMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Placement[]> {
    const entities = await this.placementRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => PlacementMapper.toDomain(entity));
  }

  async findById(id: Placement['id']): Promise<NullableType<Placement>> {
    const entity = await this.placementRepository.findOne({
      where: { id },
    });

    return entity ? PlacementMapper.toDomain(entity) : null;
  }

  async findPlacementTest(): Promise<NullableType<Placement>> {
    if (
      this._placementTestCache &&
      Date.now() < this._placementTestCache.expiresAt
    ) {
      return this._placementTestCache.data;
    }

    const entity = await this.placementRepository
      .createQueryBuilder('placement')
      .where('LOWER(placement.title) = :exactTitle', {
        exactTitle: 'placement test',
      })
      .orWhere('LOWER(placement.title) LIKE :partialTitle', {
        partialTitle: '%placement%',
      })
      .orderBy('placement.createdAt', 'DESC')
      .getOne();

    const result = entity ? PlacementMapper.toDomain(entity) : null;
    if (result) {
      this._placementTestCache = {
        data: result,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      };
    }
    return result;
  }

  async findByIds(ids: Placement['id'][]): Promise<Placement[]> {
    const entities = await this.placementRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => PlacementMapper.toDomain(entity));
  }

  async update(
    id: Placement['id'],
    payload: Partial<Placement>,
  ): Promise<Placement> {
    const entity = await this.placementRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const merged = PlacementMapper.toDomain(entity);
    Object.assign(merged, payload);

    const updatedEntity = await this.placementRepository.save(
      PlacementMapper.toPersistence(merged),
    );

    this._placementTestCache = null;
    return PlacementMapper.toDomain(updatedEntity);
  }

  async remove(id: Placement['id']): Promise<void> {
    await this.placementRepository.delete(id);
    this._placementTestCache = null;
  }
}
