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
import { PaymentRepository } from '../payments/infrastructure/persistence/payment.repository';
import { PlacementService } from '../placement/placement.service';
import { StudentAnswerRepository } from '../student-answers/infrastructure/persistence/student-answer.repository';
import { StudentAnswer } from '../student-answers/domain/student-answer';
import { Payment } from '../payments/domain/payment';
import { PlacementQuestion } from '../placement/domain/placement-question';
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
    private readonly paymentRepository: PaymentRepository,
    private readonly placementService: PlacementService,
    private readonly studentAnswerRepository: StudentAnswerRepository,
  ) {}

  /**
   * Lists students with hub meta for the signed-in admin.
   * Batches all DB queries to avoid the O(3N) N+1 pattern.
   */
  async listStudents(adminUserId: number) {
    const [adminUser, rows, activePlacement] = await Promise.all([
      this.usersRepository.findOne({
        where: { id: adminUserId },
        select: ['id', 'firstName', 'lastName', 'email'],
        loadEagerRelations: false,
      }),
      this.usersRepository.find({
        where: { role: { id: RoleEnum.student } },
        relations: ['status', 'group'],
        order: { lastName: 'ASC', firstName: 'ASC' },
      }),
      this.placementService.findPlacementTest(),
    ]);

    const studentNumericIds = rows.map((r) => r.id);

    const [allAnswers, allPayments, placementDetails] = await Promise.all([
      activePlacement && studentNumericIds.length
        ? this.studentAnswerRepository.findByPlacementIdAndStudentIds(
            activePlacement.id,
            studentNumericIds,
          )
        : Promise.resolve([] as StudentAnswer[]),
      studentNumericIds.length
        ? this.paymentRepository.findAllByStudentIds(studentNumericIds)
        : Promise.resolve([] as Payment[]),
      activePlacement
        ? this.placementService.findById(activePlacement.id)
        : Promise.resolve(null),
    ]);

    // Group by student ID for O(1) per-student lookups
    const answersByStudent = new Map<number, StudentAnswer[]>();
    for (const a of allAnswers) {
      const sid = a.studentId;
      if (!sid) continue;
      if (!answersByStudent.has(sid)) answersByStudent.set(sid, []);
      answersByStudent.get(sid)!.push(a);
    }

    const paymentsByStudent = new Map<number, Payment[]>();
    for (const p of allPayments) {
      const sid = p.studentId;
      if (!sid) continue;
      if (!paymentsByStudent.has(sid)) paymentsByStudent.set(sid, []);
      paymentsByStudent.get(sid)!.push(p);
    }

    const qMap = new Map<string, PlacementQuestion>(
      (placementDetails?.questions ?? []).map((q) => [q.id, q]),
    );

    const students = rows.map((row) =>
      this.mapStudentEntityBatch(
        row,
        activePlacement?.id ?? null,
        answersByStudent.get(row.id) ?? [],
        paymentsByStudent.get(row.id) ?? [],
        qMap,
      ),
    );

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

  /** Synchronous mapping used by listStudents — all data is pre-fetched in batch. */
  private mapStudentEntityBatch(
    row: UserEntity,
    activePlacementId: string | null,
    answers: StudentAnswer[],
    payments: Payment[],
    qMap: Map<string, PlacementQuestion>,
  ) {
    const studentId = toStudentPublicId(row.id);
    const status =
      Number(row.status?.id) === StatusEnum.inactive ? 'inactive' : 'active';

    const placement =
      activePlacementId && answers.length
        ? this.computePlacementSummaryFromData(answers, qMap)
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
        planKey: p.planKey ?? null,
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

  /** Computes placement summary from pre-fetched answer list (no DB calls). */
  private computePlacementSummaryFromData(
    answers: StudentAnswer[],
    qMap: Map<string, PlacementQuestion>,
  ) {
    const submittedAt = answers[0]?.submittedAt;
    const total = answers.length;
    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    const score = total ? Math.round((correctAnswers / total) * 100) : 0;

    const mistakes = answers
      .filter((a) => !a.isCorrect)
      .map((a) => {
        const q = qMap.get(a.questionId);
        return {
          questionId: q?.id ? toQuestionPublicId(q.id) : '',
          questionPrompt: q?.prompt ?? '',
          studentAnswer: a.answer,
          correctAnswer: q?.correctAnswer ?? '',
        };
      });

    return {
      score,
      totalQuestions: total,
      correctAnswers,
      submittedAt: submittedAt ? submittedAt.toISOString() : null,
      mistakes,
    };
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
        planKey: p.planKey ?? null,
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
