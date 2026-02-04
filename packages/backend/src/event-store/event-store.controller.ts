import { Controller, Get, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetAllEventsUseCase } from './application/get-all-events.use-case';
import { EventResponseDto } from './application/event-response.dto';
import {
  ApiResponseDto,
  ApiErrorResponseDto,
} from '../shared/dto/api-response.dto';

@ApiTags('event-store')
@Controller('event-store')
export class EventStoreController {
  constructor(private readonly getAllEventsUseCase: GetAllEventsUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Get all events from event-store' })
  @ApiResponse({
    status: 200,
    description: 'Events retrieved successfully',
    type: ApiResponseDto<EventResponseDto[]>,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ApiErrorResponseDto,
  })
  async getAllEvents() {
    const result = await this.getAllEventsUseCase.execute();

    if (!result.success) {
      throw new HttpException(
        result.error || 'Failed to get all events',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      success: true,
      data: result.data,
    };
  }
}
