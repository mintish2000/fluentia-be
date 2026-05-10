import { FileEntity } from '../../../../../files/infrastructure/persistence/relational/entities/file.entity';
import { StudentGroupEntity } from '../../../../../student-groups/infrastructure/persistence/relational/entities/student-group.entity';

import { FileMapper } from '../../../../../files/infrastructure/persistence/relational/mappers/file.mapper';
import { RoleEntity } from '../../../../../roles/infrastructure/persistence/relational/entities/role.entity';
import { StatusEntity } from '../../../../../statuses/infrastructure/persistence/relational/entities/status.entity';
import { User } from '../../../../domain/user';
import { UserEntity } from '../entities/user.entity';

export class UserMapper {
  static toDomain(raw: UserEntity): User {
    const domainEntity = new User();
    domainEntity.id = raw.id;
    domainEntity.email = raw.email;
    domainEntity.password = raw.password;
    domainEntity.firstName = raw.firstName;
    domainEntity.lastName = raw.lastName;
    if (raw.photo) {
      domainEntity.photo = FileMapper.toDomain(raw.photo);
    }
    domainEntity.role = raw.role;
    domainEntity.status = raw.status;
    if (raw.group) {
      domainEntity.group = {
        id: raw.group.id,
        name: raw.group.name,
      };
    } else {
      domainEntity.group = null;
    }
    domainEntity.adminNotes = raw.adminNotes;
    domainEntity.nextPaymentDate = raw.nextPaymentDate;
    domainEntity.nextPaymentAmount = raw.nextPaymentAmount;
    domainEntity.shift = raw.shift;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    domainEntity.deletedAt = raw.deletedAt ?? undefined;
    return domainEntity;
  }

  static toPersistence(domainEntity: User): UserEntity {
    let role: RoleEntity | undefined = undefined;

    if (domainEntity.role) {
      role = new RoleEntity();
      role.id = Number(domainEntity.role.id);
    }

    let photo: FileEntity | undefined | null = undefined;

    if (domainEntity.photo) {
      photo = new FileEntity();

      if (domainEntity.photo.id) {
        photo.id = domainEntity.photo.id;
      }

      if (domainEntity.photo.path) {
        photo.path = domainEntity.photo.path;
      }
    } else if (domainEntity.photo === null) {
      photo = null;
    }

    let status: StatusEntity | undefined = undefined;

    if (domainEntity.status) {
      status = new StatusEntity();
      status.id = Number(domainEntity.status.id);
    }

    let group: StudentGroupEntity | undefined | null = undefined;
    if (domainEntity.group?.id) {
      group = new StudentGroupEntity();
      group.id = String(domainEntity.group.id);
    } else if (domainEntity.group === null) {
      group = null;
    }

    const persistenceEntity = new UserEntity();
    if (domainEntity.id && typeof domainEntity.id === 'number') {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.email = domainEntity.email;
    persistenceEntity.password = domainEntity.password;
    persistenceEntity.firstName = domainEntity.firstName;
    persistenceEntity.lastName = domainEntity.lastName;
    persistenceEntity.photo = photo;
    persistenceEntity.role = role;
    persistenceEntity.status = status;
    persistenceEntity.group = group;
    persistenceEntity.adminNotes = domainEntity.adminNotes;
    persistenceEntity.nextPaymentDate = domainEntity.nextPaymentDate;
    persistenceEntity.nextPaymentAmount = domainEntity.nextPaymentAmount;
    persistenceEntity.shift = domainEntity.shift;
    persistenceEntity.createdAt = domainEntity.createdAt ?? new Date();
    persistenceEntity.updatedAt = domainEntity.updatedAt ?? new Date();
    persistenceEntity.deletedAt = domainEntity.deletedAt;
    return persistenceEntity;
  }
}
