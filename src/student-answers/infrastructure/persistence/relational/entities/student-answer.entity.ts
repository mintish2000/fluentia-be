import { PlacementEntity } from '../../../../../placement/infrastructure/persistence/relational/entities/placement.entity';

import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  Column,
  Index,
  JoinColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'student_answer',
})
export class StudentAnswerEntity extends EntityRelationalHelper {
  @Column({
    nullable: false,
    type: Date,
  })
  submittedAt?: Date;

  @Column({
    nullable: false,
    type: Boolean,
  })
  isCorrect?: boolean;

  @Column({
    nullable: false,
    type: String,
  })
  answer: string;

  @Index()
  @Column({ nullable: false, type: 'uuid', insert: false, update: false })
  placementId: string;

  @ManyToOne(() => PlacementEntity, { eager: false, nullable: false })
  @JoinColumn({ name: 'placementId' })
  placement: PlacementEntity;

  @Column({
    nullable: false,
    type: 'uuid',
  })
  questionId: string;

  @Index()
  @Column({ nullable: false, type: 'integer', insert: false, update: false })
  studentId: number;

  @ManyToOne(() => UserEntity, { eager: false, nullable: false })
  @JoinColumn({ name: 'studentId' })
  student: UserEntity;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
