import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { StudentAnswer } from '../../domain/student-answer';

export abstract class StudentAnswerRepository {
  abstract create(
    data: Omit<StudentAnswer, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<StudentAnswer>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<StudentAnswer[]>;

  abstract findByPlacementId(placementId: string): Promise<StudentAnswer[]>;

  abstract findByPlacementIdAndStudentId(
    placementId: string,
    studentId: number,
  ): Promise<StudentAnswer[]>;

  /**
   * Batch variant: fetches answers for multiple students in a single query.
   * Returned answers include `studentId` raw FK (no relation load needed).
   */
  abstract findByPlacementIdAndStudentIds(
    placementId: string,
    studentIds: number[],
  ): Promise<StudentAnswer[]>;

  /**
   * Aggregate per-student score summary (single GROUP BY query, avoids loading all answer rows).
   */
  abstract getPlacementScoreSummary(
    placementId: string,
  ): Promise<Array<{ studentId: number; total: number; correct: number }>>;

  abstract getAttemptSummaryByPlacementIdAndStudentId(
    placementId: string,
    studentId: number,
  ): Promise<{ attemptCount: number; lastSubmittedAt: Date | null }>;

  abstract findById(
    id: StudentAnswer['id'],
  ): Promise<NullableType<StudentAnswer>>;

  abstract findByIds(ids: StudentAnswer['id'][]): Promise<StudentAnswer[]>;

  abstract update(
    id: StudentAnswer['id'],
    payload: DeepPartial<StudentAnswer>,
  ): Promise<StudentAnswer | null>;

  abstract remove(id: StudentAnswer['id']): Promise<void>;
}
