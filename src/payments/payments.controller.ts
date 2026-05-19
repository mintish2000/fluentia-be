import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Payment } from './domain/payment';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllPaymentsDto } from './dto/find-all-payments.dto';
import { CreateMyPaymentDto } from './dto/create-my-payment.dto';
import { PaymentStatusEnum } from './payment-status.enum';
import { PaypalService } from './paypal.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PLAN_CATALOGUE } from './plans.catalogue';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { RoleEnum } from '../roles/roles.enum';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'payments',
  version: '1',
})
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paypalService: PaypalService,
  ) {}

  @Post('orders')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { orderId: { type: 'string' } },
    },
  })
  async createPaypalOrder(
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<{ orderId: string }> {
    const plan =
      PLAN_CATALOGUE[createOrderDto.planId as keyof typeof PLAN_CATALOGUE];
    if (!plan) {
      throw new BadRequestException(`Unknown planId: ${createOrderDto.planId}`);
    }
    const orderId = await this.paypalService.createOrder(
      createOrderDto.planId as keyof typeof PLAN_CATALOGUE,
      plan,
    );
    return { orderId };
  }

  @Post('orders/:orderId/capture')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'orderId', type: String, required: true })
  @ApiOkResponse({
    type: Payment,
  })
  async capturePaypalOrder(
    @Param('orderId') orderId: string,
    @Request() request,
  ): Promise<Payment> {
    const captured = await this.paypalService.captureOrderById(orderId);
    return this.paymentsService.createForStudent(request.user.id, {
      amount: captured.amount,
      currency: captured.currency,
      status: PaymentStatusEnum.paid,
      providerReference: captured.providerReference,
      planKey: captured.planKey,
    });
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.admin)
  @ApiCreatedResponse({
    type: Payment,
  })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Post('my')
  @ApiCreatedResponse({
    type: Payment,
  })
  createMyPayment(
    @Request() request,
    @Body() createMyPaymentDto: CreateMyPaymentDto,
  ) {
    if (!createMyPaymentDto.providerReference) {
      throw new BadRequestException(
        'providerReference is required to record a payment',
      );
    }
    return this.paymentsService.createForStudent(request.user.id, {
      amount: createMyPaymentDto.amount,
      currency: createMyPaymentDto.currency,
      status: PaymentStatusEnum.paid,
      providerReference: createMyPaymentDto.providerReference,
    });
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.admin)
  @ApiOkResponse({
    type: InfinityPaginationResponse(Payment),
  })
  async findAll(
    @Query() query: FindAllPaymentsDto,
  ): Promise<InfinityPaginationResponseDto<Payment>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.paymentsService.findAllWithPagination({
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @Get('my')
  @ApiOkResponse({
    type: InfinityPaginationResponse(Payment),
  })
  async findMyPayments(
    @Request() request,
    @Query() query: FindAllPaymentsDto,
  ): Promise<InfinityPaginationResponseDto<Payment>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.paymentsService.findMyPayments(request.user.id, {
        page,
        limit,
      }),
      { page, limit },
    );
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.admin)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Payment,
  })
  findById(@Param('id') id: string) {
    return this.paymentsService.findById(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.admin)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: Payment,
  })
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.paymentsService.remove(id);
  }
}
