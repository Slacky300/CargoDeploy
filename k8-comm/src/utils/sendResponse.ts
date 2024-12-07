import { Response } from 'express';

export const sendResponse = (res: Response, statusCode: number, payload: object): void => {
  res.status(statusCode).json(payload);
};
