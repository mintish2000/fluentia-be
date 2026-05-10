import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { RoleEntity } from '../../../../../roles/infrastructure/persistence/relational/entities/role.entity';
import { StatusEntity } from '../../../../../statuses/infrastructure/persistence/relational/entities/status.entity';
import { FileEntity } from '../../../../../files/infrastructure/persistence/relational/entities/file.entity';
import { StudentGroupEntity } from '../../../../../student-groups/infrastructure/persistence/relational/entities/student-group.entity';

import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { ShiftEnum } from '../../../../../users/enums/shift.enum';

@Entity({
  name: 'user',
})
export class UserEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  // For "string | null" we need to use String type.
  // More info: https://github.com/typeorm/typeorm/issues/2567
  @Column({ type: String, unique: true, nullable: true })
  email: string | null;

  @Column({ nullable: true })
  password?: string;

  @Index()
  @Column({ type: String, nullable: true })
  firstName: string | null;

  @Index()
  @Column({ type: String, nullable: true })
  lastName: string | null;

  @OneToOne(() => FileEntity, {
    eager: false,
  })
  @JoinColumn()
  photo?: FileEntity | null;

  @ManyToOne(() => RoleEntity, {
    eager: false,
  })
  role?: RoleEntity | null;

  @ManyToOne(() => StatusEntity, {
    eager: false,
  })
  status?: StatusEntity;

  @ManyToOne(() => StudentGroupEntity, {
    eager: false,
    nullable: true,
  })
  @JoinColumn()
  group?: StudentGroupEntity | null;

  @Column({ type: 'text', nullable: true })
  adminNotes?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  nextPaymentDate?: Date | null;

  @Column({ type: 'double precision', nullable: true })
  nextPaymentAmount?: number | null;

  @Column({
    type: 'enum',
    enum: ShiftEnum,
    default: ShiftEnum.morning,
    nullable: true,
  })
  shift?: ShiftEnum | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date | null;
}
