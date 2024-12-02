import { Response } from 'express';
type ResponseType = {
    success: boolean;
    message: string;
    data?: any;
    error?: any;
};


export const sendResponse = (res: Response, statusCode: number, payload: object): void => {
  res.status(statusCode).json(payload);
};
