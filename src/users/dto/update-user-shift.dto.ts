import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ShiftEnum } from '../enums/shift.enum';

/** Body for `PATCH /api/v1/student/shift` (student updates their own shift). */
export class UpdateUserShiftDto {
  @ApiProperty({ enum: ShiftEnum, enumName: 'ShiftEnum' })
  @IsNotEmpty()
  @IsEnum(ShiftEnum)
  shift: ShiftEnum;
}
