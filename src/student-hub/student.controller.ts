import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import { AdminStudentsService } from '../admin/admin-students.service';
import { StudentPlacementService } from './student-placement.service';
import { UpdateUserShiftDto } from '../users/dto/update-user-shift.dto';

/**
 * Student routes under `/api/v1/student/*` (JWT + student role).
 */
@ApiTags('Student')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RoleEnum.student)
@Controller({
  path: 'student',
  version: '1',
})
export class StudentController {
  constructor(
    private readonly adminStudentsService: AdminStudentsService,
    private readonly studentPlacementService: StudentPlacementService,
  ) {}

  /**
   * Hub summary: placement, group, payments (see `docs/student hub/student-hub.json`).
   */
  @Get('hub')
  @ApiOperation({ summary: 'Student hub (placement summary, group, payments)' })
  getHub(@Req() req: { user: JwtPayloadType }) {
    return this.adminStudentsService.getStudentHubWire(Number(req.user.id));
  }

  /**
   * Student updates their own shift (morning / evening).
   */
  @Patch('shift')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update my shift (morning / evening)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { shift: { type: 'string', enum: ['morning', 'evening'] } },
    },
  })
  patchMyShift(
    @Req() req: { user: JwtPayloadType },
    @Body() body: UpdateUserShiftDto,
  ) {
    return this.adminStudentsService.patchMyShift(
      Number(req.user.id),
      body.shift,
    );
  }

  /**
   * Full placement test for the exam UI — questions **without** correct answers.
   */
  @Get('placement')
  @ApiOperation({ summary: 'Load placement test (questions for the learner)' })
  getPlacement() {
    return this.studentPlacementService.getPlacementExam();
  }
}
