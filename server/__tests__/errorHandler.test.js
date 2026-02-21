const { errorHandler } = require('../middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
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
});
