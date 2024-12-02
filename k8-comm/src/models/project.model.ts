import mongoose from "mongoose";
import { Project } from "../types/model.types";

const projectSchema = new mongoose.Schema<Project>({
    name: { type: String, required: true },
    description: { type: String },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deployments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Deployment" }],
}, { timestamps: true });

export const ProjectModel = mongoose.model<Project>('Project', projectSchema);