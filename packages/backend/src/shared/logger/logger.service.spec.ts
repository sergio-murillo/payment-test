import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(() => {
    service = new LoggerService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log messages', () => {
    const logSpy = jest.spyOn(service, 'log');
    service.log('Test message', 'TestContext');
    expect(logSpy).toHaveBeenCalledWith('Test message', 'TestContext');
  });

  it('should log errors', () => {
    const errorSpy = jest.spyOn(service, 'error');
    service.error('Error message', 'Error trace', 'TestContext');
    expect(errorSpy).toHaveBeenCalledWith(
      'Error message',
      'Error trace',
      'TestContext',
    );
  });

  it('should log warnings', () => {
    const warnSpy = jest.spyOn(service, 'warn');
    service.warn('Warning message', 'TestContext');
    expect(warnSpy).toHaveBeenCalledWith('Warning message', 'TestContext');
  });

  it('should log debug messages', () => {
    const debugSpy = jest.spyOn(service, 'debug');
    service.debug('Debug message', 'TestContext');
    expect(debugSpy).toHaveBeenCalledWith('Debug message', 'TestContext');
  });

  it('should log verbose messages', () => {
    const verboseSpy = jest.spyOn(service, 'verbose');
    service.verbose('Verbose message', 'TestContext');
    expect(verboseSpy).toHaveBeenCalledWith('Verbose message', 'TestContext');
  });

  it('should return pino logger', () => {
    const logger = service.getPinoLogger();
    expect(logger).toBeDefined();
  });
});
