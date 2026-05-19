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
  name: 'payment',
})
export class PaymentEntity extends EntityRelationalHelper {
  @Column({
    nullable: true,
    type: Date,
  })
  paidAt?: Date | null;

  @Column({
    nullable: true,
    type: String,
  })
  providerReference?: string | null;

  @Column({
    nullable: false,
    type: String,
  })
  status!: string;

  @Column({
    nullable: false,
    type: String,
  })
  currency!: string;

  @Column({
    nullable: false,
    type: Number,
  })
  amount!: number;

  @Column({ nullable: true, type: String })
  planKey?: string | null;

  @Index()
  @Column({ nullable: false, type: 'integer' })
  studentId!: number;

  @ManyToOne(() => UserEntity, { eager: false, nullable: false })
  @JoinColumn({ name: 'studentId' })
  student!: UserEntity;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}
