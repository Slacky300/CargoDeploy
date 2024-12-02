import { Document, Types } from 'mongoose';

/**
 * Represents the log entry for a deployment, including the log details
 * and timestamps for record creation and updates.
 */
export interface DeploymentLogs extends Document {
    deploymentId: Types.ObjectId;
    logs: string;
    logLevel?: 'info' | 'warn' | 'error'; // Optional log level for categorizing logs
    timestamps: {
        createdAt: Date;
        updatedAt: Date;
    };
}

/**
 * Represents a deployment entity linked to a project, detailing deployment 
 * specifications, replicas count, associated log records, and timestamps.
 */
export interface Deployment extends Document {

    name: string;
    projectId: Types.ObjectId;
    replicas?: number;
    image?: string;
    logs?: Types.ObjectId | DeploymentLogs; // Linked logs with option for population
    timestamps: {
        createdAt: Date;
        updatedAt: Date;
    };
    container_name?: string; // Optional field for container name
    job_name?: string; // Optional field for job name
    deploymentStatus: 'pending' | 'running' | 'failed' | 'completed'; // Deployment status with predefined options

}

/**
 * Represents a project entity containing metadata, owner reference,
 * and a list of deployments associated with the project.
 */
export interface Project extends Document {
    name: string;
    description?: string; // Optional project description
    owner: Types.ObjectId; // Reference to User
    deployments?: Types.ObjectId[]; // List of associated deployment IDs
    timestamps: {
        createdAt: Date;
        updatedAt: Date;
    };
}

/**
 * Represents a user in the system, with identification details, authentication 
 * fields, and a role designation.
 */
export interface User extends Document {
    _id: Types.ObjectId;
    name: string;
    email: string;
    username?: string; // Optional field for username
    role: 'admin' | 'developer' | 'viewer'; // User role with predefined options
    timestamps: {
        createdAt: Date;
        updatedAt: Date;
    };
    auth_service_id?: string; // Optional field for external auth service ID
    projects?: Types.ObjectId[]; // List of associated project IDs
}


