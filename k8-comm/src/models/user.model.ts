import mongoose from "mongoose";
import { User } from "../types/model.types";


const userSchema = new mongoose.Schema<User>({

    name: { type: String, required: true },
    username: { type: String, required: false },
    email: { type: String, required: true },
    role: { type: String, required: true },
    auth_service_id: { type: String },
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],

}, { timestamps: true });

export const UserModel = mongoose.model<User>('User', userSchema);

