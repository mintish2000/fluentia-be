import { randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { StudentAnswerRepository } from '../student-answers/infrastructure/persistence/student-answer.repository';
import { StudentAnswer } from '../student-answers/domain/student-answer';
import { SubmitPlacementAnswersDto } from './dto/submit-placement-answers.dto';
import { SubmitPlacementResponseDto } from './dto/submit-placement-response.dto';
import {
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PlacementRepository } from './infrastructure/persistence/placement.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Placement } from './domain/placement';
import { PlacementQuestion } from './domain/placement-question';

/**
 * Single service for placement test metadata and embedded questions (JSONB).
 */
@Injectable()
export class PlacementService {
  constructor(
    private readonly usersService: UsersService,
    private readonly studentAnswerRepository: StudentAnswerRepository,
    private readonly placementRepository: PlacementRepository,
  ) {}

  async create(
    data: Omit<Placement, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Placement> {
    return this.placementRepository.create({
      ...data,
      questions: data.questions ?? [],
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.placementRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Placement['id']) {
    return this.placementRepository.findById(id);
  }

  /**
   * Returns the configured placement test (title match).
   */
  findPlacementTest() {
    return this.placementRepository.findPlacementTest();
  }

  findByIds(ids: Placement['id'][]) {
    return this.placementRepository.findByIds(ids);
  }

  /**
   * Resolves one embedded question by id.
   */
  async findQuestion(
    placementId: string,
    questionId: string,
  ): Promise<PlacementQuestion | null> {
    const p = await this.placementRepository.findById(placementId);
    return p?.questions.find((q) => q.id === questionId) ?? null;
  }

  /**
   * Loads questions from persistence.
   */
  async getQuestions(placementId: string): Promise<PlacementQuestion[]> {
    const p = await this.placementRepository.findById(placementId);
    return p?.questions ?? [];
  }

  async addQuestion(
    placementId: string,
    data: {
      prompt: string;
      options: string;
      correctAnswer: string;
    },
  ): Promise<PlacementQuestion> {
    const p = await this.placementRepository.findById(placementId);
    if (!p) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { placement: 'notExists' },
      });
    }
    const now = new Date();
    const q = Object.assign(new PlacementQuestion(), {
      id: randomUUID(),
      prompt: data.prompt,
      options: data.options,
      correctAnswer: data.correctAnswer,
      createdAt: now,
      updatedAt: now,
    });
    const next = [...p.questions, q];
    await this.placementRepository.update(placementId, { questions: next });
    return q;
  }

  async updateQuestion(
    placementId: string,
    questionId: string,
    patch: Partial<
      Pick<PlacementQuestion, 'prompt' | 'options' | 'correctAnswer'>
    >,
  ): Promise<PlacementQuestion> {
    const p = await this.placementRepository.findById(placementId);
    if (!p) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { placement: 'notExists' },
      });
    }
    const idx = p.questions.findIndex((x) => x.id === questionId);
    if (idx < 0) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { question: 'notExists' },
      });
    }
    const now = new Date();
    const cur = p.questions[idx];
    const merged = Object.assign(new PlacementQuestion(), cur, patch, {
      updatedAt: now,
    });
    const next = [...p.questions];
    next[idx] = merged;
    await this.placementRepository.update(placementId, { questions: next });
    return merged;
  }

  async deleteQuestion(placementId: string, questionId: string): Promise<void> {
    const p = await this.placementRepository.findById(placementId);
    if (!p) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { placement: 'notExists' },
      });
    }
    const next = p.questions.filter((q) => q.id !== questionId);
    await this.placementRepository.update(placementId, { questions: next });
  }

  async update(id: Placement['id'], payload: Partial<Placement>) {
    return this.placementRepository.update(id, payload);
  }

  remove(id: Placement['id']) {
    return this.placementRepository.remove(id);
  }

  getAnswersByPlacementId(placementId: string) {
    return this.studentAnswerRepository.findByPlacementId(placementId);
  }

  getAnswersByPlacementIdAndStudentId(placementId: string, studentId: number) {
    return this.studentAnswerRepository.findByPlacementIdAndStudentId(
      placementId,
      studentId,
    );
  }

  async isPlacementById(placementId: string): Promise<boolean> {
    const p = await this.placementRepository.findById(placementId);
    if (!p) {
      return false;
    }
    return this._isPlacementTitle(p.title);
  }

  async hasStudentAttempt(
    placementId: string,
    studentId: number,
  ): Promise<boolean> {
    const existing =
      await this.studentAnswerRepository.findByPlacementIdAndStudentId(
        placementId,
        studentId,
      );
    return existing.length > 0;
  }

  getStudentAttemptSummary(placementId: string, studentId: number) {
    return this.studentAnswerRepository.getAttemptSummaryByPlacementIdAndStudentId(
      placementId,
      studentId,
    );
  }

  /**
   * Evaluates submitted answers and persists per-question rows.
   */
  async submit(
    placementId: Placement['id'],
    studentId: number,
    submitDto: SubmitPlacementAnswersDto,
  ): Promise<SubmitPlacementResponseDto> {
    const placement = await this.placementRepository.findById(placementId);
    if (!placement) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          placement: 'notExists',
        },
      });
    }

    const student = await this.usersService.findById(studentId);
    if (!student) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          student: 'notExists',
        },
      });
    }

    const questions = placement.questions ?? [];
    if (this._isPlacementTitle(placement.title)) {
      if (questions.length === 0) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            placementTest: 'noQuestionsConfigured',
          },
        });
      }
      if (submitDto.answers.length !== questions.length) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            placementTest: 'allQuestionsAreRequired',
          },
        });
      }
      const existingAttempt =
        await this.studentAnswerRepository.findByPlacementIdAndStudentId(
          placementId,
          studentId,
        );
      if (existingAttempt.length) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            placementTest: 'alreadySubmitted',
          },
        });
      }
    }
    const questionsById = new Map(
      questions.map((question) => [String(question.id), question]),
    );

    let correctAnswers = 0;
    const results: SubmitPlacementResponseDto['answers'] = [];
    const submittedAt = new Date();
    const toInsert: Omit<StudentAnswer, 'id' | 'createdAt' | 'updatedAt'>[] =
      [];

    for (const submittedAnswer of submitDto.answers) {
      const question = questionsById.get(submittedAnswer.questionId);

      if (!question) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            questionId: `invalidForPlacement:${submittedAnswer.questionId}`,
          },
        });
      }
      if (
        this._isPlacementTitle(placement.title) &&
        !this._hasAnswerContent(submittedAnswer.answer)
      ) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            placementTest: `answerRequired:${submittedAnswer.questionId}`,
          },
        });
      }

      const isCorrect =
        this._normalizeAnswer(question.correctAnswer) ===
        this._normalizeAnswer(submittedAnswer.answer);

      if (isCorrect) {
        correctAnswers += 1;
      }

      toInsert.push({
        answer: submittedAnswer.answer,
        isCorrect,
        submittedAt,
        placement,
        placementId: placement.id,
        questionId: question.id,
        student,
        studentId: Number(student.id),
      });

      results.push({
        questionId: String(question.id),
        isCorrect,
      });
    }

    await this.studentAnswerRepository.createMany(toInsert);

    const answeredQuestions = submitDto.answers.length;
    const score = answeredQuestions
      ? Math.round((correctAnswers / answeredQuestions) * 100)
      : 0;
    const passingScore = placement.passingScore ?? null;

    return {
      placementId: String(placement.id),
      totalQuestions: questions.length,
      answeredQuestions,
      correctAnswers,
      score,
      passingScore,
      passed: passingScore === null ? true : score >= passingScore,
      answers: results,
    };
  }

  private _isPlacementTitle(title: string): boolean {
    const normalized = (title || '').trim().toLowerCase();
    return normalized === 'placement test' || normalized.includes('placement');
  }

  private _normalizeAnswer(answer: string): string {
    const raw = (answer || '').trim().toLowerCase();
    if (!raw.includes('||')) {
      return raw;
    }

    return raw
      .split('||')
      .map((value) => value.trim())
      .filter(Boolean)
      .sort()
      .join('||');
  }

  private _hasAnswerContent(answer: string): boolean {
    const raw = (answer || '').trim();
    if (!raw) {
      return false;
    }

    if (!raw.includes('||')) {
      return true;
    }

    return (
      raw
        .split('||')
        .map((value) => value.trim())
        .filter(Boolean).length > 0
    );
  }
}
