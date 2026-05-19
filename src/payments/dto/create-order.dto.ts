import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    example: 'group-1m',
    description: 'Pricing plan identifier',
  })
  @IsString()
  @IsNotEmpty()
  planId: string | undefined;
}
