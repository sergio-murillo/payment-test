import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ProcessPaymentUseCase } from './application/process-payment.use-case';
import { ProcessPaymentDto } from './application/process-payment.dto';
import { PaymentResponseDto } from './application/payment-response.dto';
import {
  ApiResponseDto,
  ApiErrorResponseDto,
} from '../shared/dto/api-response.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly processPaymentUseCase: ProcessPaymentUseCase) {}

  @Post('process')
  @ApiOperation({ summary: 'Process a payment' })
  @ApiBody({ type: ProcessPaymentDto })
  @ApiResponse({
    status: 200,
    description: 'Payment processing started',
    type: ApiResponseDto<PaymentResponseDto>,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ApiErrorResponseDto,
  })
  async processPayment(@Body() dto: ProcessPaymentDto) {
    const result = await this.processPaymentUseCase.execute(dto);

    if (!result.success) {
      throw new HttpException(
        result.error || 'Failed to process payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      success: true,
      data: result.data,
    };
  }
}
