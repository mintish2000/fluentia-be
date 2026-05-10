import { Exclude, Expose } from 'class-transformer';
import { FileType } from '../../files/domain/file';
import { Role } from '../../roles/domain/role';
import { Status } from '../../statuses/domain/status';
import { ApiProperty } from '@nestjs/swagger';
import { ShiftEnum } from '../enums/shift.enum';

const idType = Number;

export class User {
  @ApiProperty({
    type: idType,
  })
  id: number | string;

  @ApiProperty({
    type: String,
    example: 'john.doe@example.com',
  })
  @Expose({ groups: ['me', 'admin'] })
  email: string | null;

  @Exclude({ toPlainOnly: true })
  password?: string;

  @ApiProperty({
    type: String,
    example: 'John',
  })
  firstName: string | null;

  @ApiProperty({
    type: String,
    example: 'Doe',
  })
  lastName: string | null;

  @ApiProperty({
    type: () => FileType,
  })
  photo?: FileType | null;

  @ApiProperty({
    type: () => Role,
  })
  role?: Role | null;

  @ApiProperty({
    type: () => Status,
  })
  status?: Status;

  @ApiProperty({
    type: () => Object,
    nullable: true,
    description: 'Student group (admin roster)',
  })
  group?: { id: string; name?: string } | null;

  @ApiProperty({ nullable: true })
  adminNotes?: string | null;

  @ApiProperty({ nullable: true })
  nextPaymentDate?: Date | null;

  @ApiProperty({ nullable: true })
  nextPaymentAmount?: number | null;

  @ApiProperty({ enum: ShiftEnum, enumName: 'ShiftEnum', nullable: true })
  shift?: ShiftEnum | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
  deletedAt?: Date | null;
}
