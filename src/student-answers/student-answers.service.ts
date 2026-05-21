import { PlacementService } from '../placement/placement.service';
import { Placement } from '../placement/domain/placement';

import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';

import {
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateStudentAnswerDto } from './dto/create-student-answer.dto';
import { UpdateStudentAnswerDto } from './dto/update-student-answer.dto';
import { StudentAnswerRepository } from './infrastructure/persistence/student-answer.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { StudentAnswer } from './domain/student-answer';

@Injectable()
export class StudentAnswersService {
  constructor(
    private readonly placementService: PlacementService,
    private readonly userService: UsersService,
    private readonly studentAnswerRepository: StudentAnswerRepository,
  ) {}

  async create(createStudentAnswerDto: CreateStudentAnswerDto) {
    const placementObject = await this.placementService.findById(
      createStudentAnswerDto.placement.id,
    );
    if (!placementObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          placement: 'notExists',
        },
      });
    }
    const placement = placementObject;

    const question = await this.placementService.findQuestion(
      placement.id,
      createStudentAnswerDto.questionId,
    );
    if (!question) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          question: 'notExists',
        },
      });
    }

    const studentObject = await this.userService.findById(
      createStudentAnswerDto.student.id,
    );
    if (!studentObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          student: 'notExists',
        },
      });
    }
    const student = studentObject;

    return this.studentAnswerRepository.create({
      submittedAt: createStudentAnswerDto.submittedAt,
      isCorrect: createStudentAnswerDto.isCorrect,
      answer: createStudentAnswerDto.answer,
      placement,
      placementId: placement.id,
      questionId: question.id,
      student,
      studentId: Number(student.id),
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.studentAnswerRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: StudentAnswer['id']) {
    return this.studentAnswerRepository.findById(id);
  }

  findByIds(ids: StudentAnswer['id'][]) {
    return this.studentAnswerRepository.findByIds(ids);
  }

  async update(
    id: StudentAnswer['id'],

    updateStudentAnswerDto: UpdateStudentAnswerDto,
  ) {
    let placement: Placement | undefined = undefined;

    if (updateStudentAnswerDto.placement) {
      const placementObject = await this.placementService.findById(
        updateStudentAnswerDto.placement.id,
      );
      if (!placementObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            placement: 'notExists',
          },
        });
      }
      placement = placementObject;
    }

    let student: User | undefined = undefined;

    if (updateStudentAnswerDto.student) {
      const studentObject = await this.userService.findById(
        updateStudentAnswerDto.student.id,
      );
      if (!studentObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            student: 'notExists',
          },
        });
      }
      student = studentObject;
    }

    return this.studentAnswerRepository.update(id, {
      submittedAt: updateStudentAnswerDto.submittedAt,
      isCorrect: updateStudentAnswerDto.isCorrect,
      answer: updateStudentAnswerDto.answer,
      placement,
      ...(placement ? { placementId: placement.id } : {}),
      ...(updateStudentAnswerDto.questionId !== undefined
        ? { questionId: updateStudentAnswerDto.questionId }
        : {}),
      student,
      ...(student ? { studentId: Number(student.id) } : {}),
    });
  }

  remove(id: StudentAnswer['id']) {
    return this.studentAnswerRepository.remove(id);
  }
}
