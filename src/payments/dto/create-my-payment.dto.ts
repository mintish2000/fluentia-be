import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateMyPaymentDto {
  @ApiProperty({
    example: 99.99,
  })
  @IsNumber()
  amount!: number;

  @ApiProperty({
    example: 'USD',
  })
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @ApiProperty({
    example: 'ch_3QwYvY2eZvKYlo2C1x2y3z4A',
    description: 'Provider transaction reference (required)',
  })
  @IsString()
  @IsNotEmpty()
  providerReference!: string;
}
