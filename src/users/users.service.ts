import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { NullableType } from '../utils/types/nullable.type';
import { FilterUserDto, SortUserDto } from './dto/query-user.dto';
import { UserRepository } from './infrastructure/persistence/user.repository';
import { User } from './domain/user';
import bcrypt from 'bcryptjs';
import { FilesService } from '../files/files.service';
import { RoleEnum } from '../roles/roles.enum';
import { StatusEnum } from '../statuses/statuses.enum';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { FileType } from '../files/domain/file';
import { Role } from '../roles/domain/role';
import { Status } from '../statuses/domain/status';
import { UpdateUserDto } from './dto/update-user.dto';
import { normalizeStoredGroupId } from '../utils/group-id.util';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UserRepository,
    private readonly filesService: FilesService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Do not remove comment below.
    // <creating-property />

    let password: string | undefined = undefined;

    if (createUserDto.password) {
      const salt = await bcrypt.genSalt();
      password = await bcrypt.hash(createUserDto.password, salt);
    }

    let email: string | null = null;

    if (createUserDto.email) {
      const userObject = await this.usersRepository.findByEmail(
        createUserDto.email,
      );
      if (userObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'emailAlreadyExists',
          },
        });
      }
      email = createUserDto.email;
    }

    let photo: FileType | null | undefined = undefined;

    if (createUserDto.photo?.id) {
      const fileObject = await this.filesService.findById(
        createUserDto.photo.id,
      );
      if (!fileObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            photo: 'imageNotExists',
          },
        });
      }
      photo = fileObject;
    } else if (createUserDto.photo === null) {
      photo = null;
    }

    let role: Role | undefined = undefined;

    if (createUserDto.role?.id) {
      const roleObject = Object.values(RoleEnum)
        .map(String)
        .includes(String(createUserDto.role.id));
      if (!roleObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            role: 'roleNotExists',
          },
        });
      }

      role = {
        id: createUserDto.role.id,
      };
    }

    let status: Status | undefined = undefined;

    if (createUserDto.status?.id) {
      const statusObject = Object.values(StatusEnum)
        .map(String)
        .includes(String(createUserDto.status.id));
      if (!statusObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            status: 'statusNotExists',
          },
        });
      }

      status = {
        id: createUserDto.status.id,
      };
    }

    let group: User['group'] | undefined = undefined;
    if (createUserDto.groupId !== undefined) {
      const raw = normalizeStoredGroupId(createUserDto.groupId);
      group = raw ? { id: raw } : null;
    }

    return this.usersRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: email,
      password: password,
      photo: photo,
      role: role,
      status: status,
      group,
      adminNotes: createUserDto.adminNotes ?? null,
      nextPaymentDate: createUserDto.nextPaymentDate ?? null,
      nextPaymentAmount: createUserDto.nextPaymentAmount ?? null,
    });
  }

  findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterUserDto | null;
    sortOptions?: SortUserDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<User[]> {
    return this.usersRepository.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });
  }

  findById(id: User['id']): Promise<NullableType<User>> {
    return this.usersRepository.findById(id);
  }

  findByIds(ids: User['id'][]): Promise<User[]> {
    return this.usersRepository.findByIds(ids);
  }

  findByEmail(email: User['email']): Promise<NullableType<User>> {
    return this.usersRepository.findByEmail(email);
  }

  async update(
    id: User['id'],
    /**
     * `shift` is accepted here for admin/student roster flows only — not on `PATCH /users/:id`
     * (see `UpdateUserDto`).
     */
    updateUserDto: UpdateUserDto | User | { shift?: User['shift'] },
  ): Promise<User | null> {
    // Do not remove comment below.
    // <updating-property />

    const patch = updateUserDto as Partial<User> & Partial<UpdateUserDto>;

    let password: string | undefined = undefined;

    if (patch.password) {
      const salt = await bcrypt.genSalt();
      password = await bcrypt.hash(patch.password, salt);
    }

    let email: string | null | undefined = undefined;

    if (patch.email) {
      const userObject = await this.usersRepository.findByEmail(patch.email);

      if (userObject && userObject.id !== id) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'emailAlreadyExists',
          },
        });
      }

      email = patch.email;
    } else if (patch.email === null) {
      email = null;
    }

    let photo: FileType | null | undefined = undefined;

    if (patch.photo?.id) {
      const fileObject = await this.filesService.findById(patch.photo.id);
      if (!fileObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            photo: 'imageNotExists',
          },
        });
      }
      photo = fileObject;
    } else if (patch.photo === null) {
      photo = null;
    }

    let role: Role | undefined = undefined;

    if (patch.role?.id) {
      const roleObject = Object.values(RoleEnum)
        .map(String)
        .includes(String(patch.role.id));
      if (!roleObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            role: 'roleNotExists',
          },
        });
      }

      role = {
        id: patch.role.id,
      };
    }

    let status: Status | undefined = undefined;

    if (patch.status?.id) {
      const statusObject = Object.values(StatusEnum)
        .map(String)
        .includes(String(patch.status.id));
      if (!statusObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            status: 'statusNotExists',
          },
        });
      }

      status = {
        id: patch.status.id,
      };
    }

    let group: User['group'] | undefined = undefined;
    if ('groupId' in patch && patch.groupId !== undefined) {
      const raw = normalizeStoredGroupId(patch.groupId);
      group = raw ? { id: raw } : null;
    }

    return this.usersRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      firstName: patch.firstName,
      lastName: patch.lastName,
      email,
      password,
      photo,
      role,
      status,
      ...('groupId' in patch && patch.groupId !== undefined ? { group } : {}),
      ...('adminNotes' in patch && patch.adminNotes !== undefined
        ? { adminNotes: patch.adminNotes }
        : {}),
      ...('nextPaymentDate' in patch && patch.nextPaymentDate !== undefined
        ? { nextPaymentDate: patch.nextPaymentDate }
        : {}),
      ...('nextPaymentAmount' in patch && patch.nextPaymentAmount !== undefined
        ? { nextPaymentAmount: patch.nextPaymentAmount }
        : {}),
      ...(patch.shift !== undefined ? { shift: patch.shift } : {}),
    });
  }

  async remove(id: User['id']): Promise<void> {
    await this.usersRepository.remove(id);
  }
}
