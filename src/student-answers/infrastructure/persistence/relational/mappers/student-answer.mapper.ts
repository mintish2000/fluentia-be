import { StudentAnswer } from '../../../../domain/student-answer';

import { PlacementMapper } from '../../../../../placement/infrastructure/persistence/relational/mappers/placement.mapper';

import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { StudentAnswerEntity } from '../entities/student-answer.entity';

export class StudentAnswerMapper {
  static toDomain(raw: StudentAnswerEntity): StudentAnswer {
    const domainEntity = new StudentAnswer();
    domainEntity.submittedAt = raw.submittedAt;

    domainEntity.isCorrect = raw.isCorrect;

    domainEntity.answer = raw.answer;

    if (raw.placement) {
      domainEntity.placement = PlacementMapper.toDomain(raw.placement);
    }
    domainEntity.placementId = raw.placementId;

    domainEntity.questionId = raw.questionId;

    if (raw.student) {
      domainEntity.student = UserMapper.toDomain(raw.student);
    }
    domainEntity.studentId = raw.studentId;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: StudentAnswer): StudentAnswerEntity {
    const persistenceEntity = new StudentAnswerEntity();
    persistenceEntity.submittedAt = domainEntity.submittedAt;

    persistenceEntity.isCorrect = domainEntity.isCorrect;

    persistenceEntity.answer = domainEntity.answer;

    if (domainEntity.placement) {
      persistenceEntity.placement = PlacementMapper.toPersistence(
        domainEntity.placement,
      );
    }

    persistenceEntity.questionId = domainEntity.questionId;

    if (domainEntity.student) {
      persistenceEntity.student = UserMapper.toPersistence(
        domainEntity.student,
      );
    }

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
