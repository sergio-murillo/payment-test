import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { CreateTransactionUseCase } from './application/create-transaction.use-case';
import { GetTransactionUseCase } from './application/get-transaction.use-case';
import { GetAllTransactionsUseCase } from './application/get-all-transactions.use-case';
import { CreateTransactionDto } from './application/create-transaction.dto';
import { TransactionResponseDto } from './application/transaction-response.dto';
import {
  ApiResponseDto,
  ApiErrorResponseDto,
} from '../shared/dto/api-response.dto';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly getTransactionUseCase: GetTransactionUseCase,
    private readonly getAllTransactionsUseCase: GetAllTransactionsUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiBody({ type: CreateTransactionDto })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
    type: ApiResponseDto<TransactionResponseDto>,
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
  async createTransaction(@Body() dto: CreateTransactionDto) {
    const result = await this.createTransactionUseCase.execute(dto);

    if (!result.success) {
      throw new HttpException(
        result.error || 'Failed to create transaction',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      success: true,
      data: result.data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({
    name: 'id',
    description: 'ID de la transacción',
    example: 'trans-12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction retrieved successfully',
    type: ApiResponseDto<TransactionResponseDto>,
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ApiErrorResponseDto,
  })
  async getTransaction(@Param('id') id: string) {
    const result = await this.getTransactionUseCase.execute(id);

    if (!result.success) {
      throw new HttpException(
        result.error || 'Transaction not found',
        result.error === 'Transaction not found'
          ? HttpStatus.NOT_FOUND
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      success: true,
      data: result.data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions' })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
    type: ApiResponseDto<TransactionResponseDto[]>,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ApiErrorResponseDto,
  })
  async getAllTransactions() {
    const result = await this.getAllTransactionsUseCase.execute();

    if (!result.success) {
      throw new HttpException(
        result.error || 'Failed to get all transactions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      success: true,
      data: result.data,
    };
  }
}
