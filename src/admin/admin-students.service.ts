import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { UsersService } from '../users/users.service';
import { PaymentsService } from '../payments/payments.service';
import { PlacementService } from '../placement/placement.service';
import { StudentAnswerRepository } from '../student-answers/infrastructure/persistence/student-answer.repository';
import { RoleEnum } from '../roles/roles.enum';
import { StatusEnum } from '../statuses/statuses.enum';
import {
  parseStudentPublicId,
  toGroupPublicId,
  toQuestionPublicId,
  toStudentPublicId,
} from './utils/admin-public-ids.util';
import { ShiftEnum } from '../users/enums/shift.enum';
/**
 * Admin student roster (`/admin/students`) mapped to Fluentia wire shapes.
 */
@Injectable()
export class AdminStudentsService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly usersService: UsersService,
    private readonly paymentsService: PaymentsService,
    private readonly placementService: PlacementService,
    private readonly studentAnswerRepository: StudentAnswerRepository,
  ) {}

  /**
   * Lists students with hub meta for the signed-in admin.
   */
  async listStudents(adminUserId: number) {
    /** Lean read: full `findById` eager-loads photo/role/status/group and repeats heavy JOINs. */
    const adminUser = await this.usersRepository.findOne({
      where: { id: adminUserId },
      select: ['id', 'firstName', 'lastName', 'email'],
      loadEagerRelations: false,
    });
    const rows = await this.usersRepository.find({
      where: { role: { id: RoleEnum.student } },
      relations: ['status', 'group'],
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
    const activePlacement = await this.placementService.findPlacementTest();
    const students: unknown[] = [];
    for (const row of rows) {
      students.push(
        await this.mapStudentEntity(row, activePlacement?.id ?? null),
      );
    }
    return {
      meta: {
        adminDisplayName:
          [adminUser?.firstName, adminUser?.lastName]
            .filter(Boolean)
            .join(' ') ||
          adminUser?.email ||
          'Admin',
      },
      students,
    };
  }

  /**
   * Student app home payload (`docs/student hub/student-hub.json`): placement summary,
   * group, payments, next payment — for the authenticated student only.
   */
  async getStudentHubWire(userId: number) {
    const row = await this.usersRepository.findOne({
      where: { id: userId, role: { id: RoleEnum.student } },
      relations: ['status', 'group'],
    });
    if (!row) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: 'Student not found',
          details: [],
        },
      });
    }
    const activePlacement = await this.placementService.findPlacementTest();
    const full = await this.mapStudentEntity(row, activePlacement?.id ?? null);
    const nextPaymentCurrency =
      full.payments.find((p) => p.currency)?.currency ?? 'USD';
    return {
      status: full.status,
      placementCompleted:
        Boolean(full.placement.submittedAt) &&
        full.placement.totalQuestions > 0,
      placement: {
        score: full.placement.score,
        totalQuestions: full.placement.totalQuestions,
        correctAnswers: full.placement.correctAnswers,
        submittedAt: full.placement.submittedAt,
      },
      group: row.group
        ? {
            id: toGroupPublicId(row.group.id),
            name: row.group.name,
            description: row.group.description ?? '',
            link: row.group.link ?? '',
          }
        : null,
      payments: full.payments,
      nextPaymentDate: full.nextPaymentDate,
      nextPaymentAmount: full.nextPaymentAmount,
      nextPaymentCurrency,
      shift: row.shift ?? ShiftEnum.morning,
    };
  }

  /**
   * Updates shift for the authenticated student (self-service).
   * @param userId Numeric user id from JWT.
   * @param shift New shift value.
   * @returns Persisted shift after update.
   */
  async patchMyShift(
    userId: number,
    shift: ShiftEnum,
  ): Promise<{ shift: ShiftEnum }> {
    const row = await this.usersRepository.findOne({
      where: { id: userId, role: { id: RoleEnum.student } },
    });
    if (!row) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: 'Student not found',
          details: [],
        },
      });
    }
    await this.usersService.update(userId, { shift });
    const next = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'shift'],
    });
    return { shift: next?.shift ?? ShiftEnum.morning };
  }

  /**
   * Returns one student by public id.
   */
  async getStudent(studentPublicId: string) {
    const id = parseStudentPublicId(studentPublicId);
    const row = await this.usersRepository.findOne({
      where: { id, role: { id: RoleEnum.student } },
      relations: ['status', 'group'],
    });
    if (!row) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: 'Student not found',
          details: [],
        },
      });
    }
    const activePlacement = await this.placementService.findPlacementTest();
    return this.mapStudentEntity(row, activePlacement?.id ?? null);
  }

  /**
   * Creates a student user with roster defaults.
   */
  async createStudent(body: {
    firstName: string;
    lastName: string;
    email: string;
    status: 'active' | 'inactive';
    groupId?: string | null;
    notes?: string;
    nextPaymentDate?: string | null;
    nextPaymentAmount?: number | null;
    /** Initial password for login provisioning. */
    password: string;
  }) {
    const created = await this.usersService.create({
      email: body.email.trim().toLowerCase(),
      password: body.password,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      role: { id: RoleEnum.student },
      status: {
        id:
          body.status === 'inactive' ? StatusEnum.inactive : StatusEnum.active,
      },
      groupId: body.groupId ?? null,
      adminNotes: body.notes ?? '',
      nextPaymentDate: body.nextPaymentDate
        ? new Date(body.nextPaymentDate)
        : null,
      nextPaymentAmount: body.nextPaymentAmount ?? null,
    });
    const row = await this.usersRepository.findOne({
      where: { id: Number(created.id) },
      relations: ['status', 'group'],
    });
    if (!row) {
      throw new UnprocessableEntityException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Student not persisted',
          details: [],
        },
      });
    }
    const activePlacement = await this.placementService.findPlacementTest();
    return this.mapStudentEntity(row, activePlacement?.id ?? null);
  }

  /**
   * Partial update for student profile fields.
   */
  async patchStudent(
    studentPublicId: string,
    body: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      status: 'active' | 'inactive';
      groupId: string | null;
      notes: string;
      nextPaymentDate: string | null;
      nextPaymentAmount: number | null;
      password: string;
      shift: ShiftEnum;
    }>,
  ) {
    const id = parseStudentPublicId(studentPublicId);
    const row = await this.usersRepository.findOne({
      where: { id, role: { id: RoleEnum.student } },
      relations: ['status', 'group'],
    });
    if (!row) {
      throw new NotFoundException({
        error: {
          code: 'NOT_FOUND',
          message: 'Student not found',
          details: [],
        },
      });
    }
    await this.usersService.update(id, {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      password: body.password,
      status:
        body.status !== undefined
          ? {
              id:
                body.status === 'inactive'
                  ? StatusEnum.inactive
                  : StatusEnum.active,
            }
          : undefined,
      groupId: body.groupId,
      ...(body.notes !== undefined ? { adminNotes: body.notes } : {}),
      nextPaymentDate: body.nextPaymentDate
        ? new Date(body.nextPaymentDate)
        : body.nextPaymentDate === null
          ? null
          : undefined,
      nextPaymentAmount: body.nextPaymentAmount,
      ...(body.shift !== undefined ? { shift: body.shift } : {}),
    });
    const next = await this.usersRepository.findOne({
      where: { id },
      relations: ['status', 'group'],
    });
    const activePlacement = await this.placementService.findPlacementTest();
    return this.mapStudentEntity(next!, activePlacement?.id ?? null);
  }

  /**
   * Convenience status toggle.
   */
  async patchStudentStatus(
    studentPublicId: string,
    body: { status: 'active' | 'inactive' },
  ) {
    return this.patchStudent(studentPublicId, { status: body.status });
  }

  /**
   * Soft-deletes a student.
   */
  async removeStudent(studentPublicId: string): Promise<void> {
    const id = parseStudentPublicId(studentPublicId);
    await this.usersService.remove(id);
  }

  private async mapStudentEntity(
    row: UserEntity,
    activePlacementId: string | null,
  ) {
    const studentId = toStudentPublicId(row.id);
    const status =
      Number(row.status?.id) === StatusEnum.inactive ? 'inactive' : 'active';

    const placement = activePlacementId
      ? await this.buildPlacementSummary(row.id, activePlacementId)
      : {
          score: 0,
          totalQuestions: 0,
          correctAnswers: 0,
          submittedAt: null as string | null,
          mistakes: [] as Array<{
            questionId: string;
            questionPrompt: string;
            studentAnswer: string;
            correctAnswer: string;
          }>,
        };

    const payments = await this.paymentsService.findAllByStudentId(row.id);

    return {
      id: studentId,
      firstName: row.firstName ?? '',
      lastName: row.lastName ?? '',
      email: row.email ?? '',
      status,
      groupId: row.group?.id ? toGroupPublicId(row.group.id) : null,
      notes: row.adminNotes ?? '',
      placement,
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        status: p.status,
      })),
      nextPaymentDate: row.nextPaymentDate
        ? row.nextPaymentDate.toISOString()
        : null,
      nextPaymentAmount: row.nextPaymentAmount ?? null,
      shift: row.shift ?? ShiftEnum.morning,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async buildPlacementSummary(
    studentNumericId: number,
    activePlacementId: string,
  ) {
    const answers =
      await this.studentAnswerRepository.findByPlacementIdAndStudentId(
        activePlacementId,
        studentNumericId,
      );
    if (!answers.length) {
      return {
        score: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        submittedAt: null as string | null,
        mistakes: [] as Array<{
          questionId: string;
          questionPrompt: string;
          studentAnswer: string;
          correctAnswer: string;
        }>,
      };
    }

    const submittedAt = answers[0]?.submittedAt;
    const total = answers.length;
    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    const score = total ? Math.round((correctAnswers / total) * 100) : 0;

    const mistakes: Array<{
      questionId: string;
      questionPrompt: string;
      studentAnswer: string;
      correctAnswer: string;
    }> = [];

    const placement = await this.placementService.findById(activePlacementId);
    const qMap = new Map((placement?.questions ?? []).map((q) => [q.id, q]));

    for (const a of answers) {
      if (a.isCorrect) {
        continue;
      }
      const q = qMap.get(a.questionId);
      const prompt = q?.prompt ?? '';
      const correctAnswer = q?.correctAnswer ?? '';
      const qid = q?.id ?? a.questionId;
      mistakes.push({
        questionId: qid ? toQuestionPublicId(qid) : '',
        questionPrompt: prompt,
        studentAnswer: a.answer,
        correctAnswer,
      });
    }

    return {
      score,
      totalQuestions: total,
      correctAnswers,
      submittedAt: submittedAt ? submittedAt.toISOString() : null,
      mistakes,
    };
  }
}
