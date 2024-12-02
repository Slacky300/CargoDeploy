import mongoose from "mongoose";
import { Deployment } from "../types/model.types";

const deploymentSchema = new mongoose.Schema<Deployment>({

    name: { type: String, required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    replicas: { type: Number },
    image: { type: String },
    logs: { type: mongoose.Schema.Types.ObjectId, ref: "DeploymentLogs" },
    deploymentStatus: { type: String, required: true, default: 'pending' },
    container_name: { type: String },
    job_name: { type: String },

}, { timestamps: true });

export const DeploymentModel = mongoose.model<Deployment>('Deployment', deploymentSchema);