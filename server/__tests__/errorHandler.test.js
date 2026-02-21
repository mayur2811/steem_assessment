const { errorHandler } = require('../middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let mockReq, mockRes, mockNext;
  let originalNodeEnv;

  beforeAll(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.clearAllMocks();
  });

  test('should return 500 status by default', () => {
    const error = new Error('Something went wrong');
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Something went wrong' })
    );
  });

  test('should use error.status when provided', () => {
    const error = new Error('Not Found');
    error.status = 404;
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Not Found' })
    );
  });

  test('should return default message for empty errors', () => {
    const error = new Error();
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal Server Error' })
    );
  });

  test('should NOT execute arbitrary code (RCE vulnerability removed)', () => {
    const maliciousInput = 'process.exit(1)';
    const error = new Error(maliciousInput);

    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'process.exit(1)' })
    );
  });

  test('includes stack in response when NODE_ENV is development', () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Dev error');
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Dev error',
        stack: expect.any(String),
      })
    );
  });

  test('omits stack in response when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Prod error');
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.not.objectContaining({
        stack: expect.anything(),
      })
    );
  });

  test('omits stack in response when NODE_ENV is unset', () => {
    delete process.env.NODE_ENV;
    const error = new Error('No env error');
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.not.objectContaining({
        stack: expect.anything(),
      })
    );
  });
});
