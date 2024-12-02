import { UserModel } from "../models/user.model.js";
import { Request, Response } from "express";
import { sendResponse } from "../utils/sendResponse.js";
import expressAsyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";

export const createOrLogin = expressAsyncHandler(async (req: Request, res: Response) => {
    const { username, email, auth_service_id } = req.body;

    const doesUserExist = await UserModel.findOne({ auth_service_id });
    if (doesUserExist) {
        const token = jwt.sign({ id: doesUserExist._id }, process.env.JWT_SECRET_KEY as string, { expiresIn: "1d" });
        return sendResponse(res, 200, { success: true, message: "User already exists", data: { token } });
    }

    const newUser = await UserModel.create({ username, email, auth_service_id });
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET_KEY as string, { expiresIn: "1d" });
    return sendResponse(res, 201, { success: true, message: "User created successfully", data: { token } });
});

