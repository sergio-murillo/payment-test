import { Test, TestingModule } from '@nestjs/testing';
import { EventStoreController } from './event-store.controller';
import { GetAllEventsUseCase } from './application/get-all-events.use-case';
import { Event } from './domain/event.entity';
import { HttpException } from '@nestjs/common';

describe('EventStoreController', () => {
  let controller: EventStoreController;
  let getAllEventsUseCase: jest.Mocked<GetAllEventsUseCase>;

  beforeEach(async () => {
    const mockGetAllEventsUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventStoreController],
      providers: [
        {
          provide: GetAllEventsUseCase,
          useValue: mockGetAllEventsUseCase,
        },
      ],
    }).compile();

    controller = module.get<EventStoreController>(EventStoreController);
    getAllEventsUseCase = module.get(GetAllEventsUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllEvents', () => {
    it('should return all events', async () => {
      const now = new Date();
      const events = [
        new Event(
          'agg-001',
          'TransactionCreated',
          { id: 'trans-001' },
          now,
          'evt-001',
        ),
        new Event(
          'agg-002',
          'PaymentProcessed',
          { id: 'trans-002' },
          new Date(now.getTime() + 1000),
          'evt-002',
        ),
      ];

      getAllEventsUseCase.execute.mockResolvedValue({
        success: true,
        data: events,
      });

      const result = await controller.getAllEvents();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(events);
      expect(getAllEventsUseCase.execute).toHaveBeenCalled();
    });

    it('should throw HttpException when use case fails', async () => {
      getAllEventsUseCase.execute.mockResolvedValue({
        success: false,
        error: 'Failed to get all events',
      });

      await expect(controller.getAllEvents()).rejects.toThrow(HttpException);
    });

    it('should return empty array when no events found', async () => {
      getAllEventsUseCase.execute.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await controller.getAllEvents();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle internal server error', async () => {
      getAllEventsUseCase.execute.mockResolvedValue({
        success: false,
        error: 'Database connection error',
      });

      await expect(controller.getAllEvents()).rejects.toThrow(HttpException);
    });
  });
});
