import { Placement } from '../../placement/domain/placement';
import { User } from '../../users/domain/user';
import { ApiProperty } from '@nestjs/swagger';

export class StudentAnswer {
  @ApiProperty({
    type: () => Date,
    nullable: false,
  })
  submittedAt?: Date;

  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  isCorrect?: boolean;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  answer: string;

  @ApiProperty({
    type: () => Placement,
    nullable: false,
  })
  placement: Placement;

  @ApiProperty({
    description: 'Question id inside placement.questions JSON',
  })
  questionId: string;

  @ApiProperty({
    type: () => User,
    nullable: false,
  })
  student: User;

  /** Raw FK value — populated by batch queries that skip relation loading. */
  studentId?: number;

  /** Raw FK value — populated by batch queries that skip relation loading. */
  placementId?: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
