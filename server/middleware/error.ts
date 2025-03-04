import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '@shared/errors';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log the error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.status).json({
      message: err.message,
      code: err.code,
      details: err.details,
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    return res.status(400).json({
      message: 'Validation error',
      code: ErrorCodes.VALIDATION_ERROR,
      details: validationError.details,
    });
  }

  // Handle other known error types
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      message: 'Authentication required',
      code: ErrorCodes.UNAUTHORIZED,
    });
  }

  // Handle unknown errors
  return res.status(500).json({
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    code: ErrorCodes.INTERNAL_ERROR,
  });
} 