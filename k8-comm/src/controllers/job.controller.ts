import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import { createJob } from "../utils/k8job.js";
import { sendResponse } from "../utils/sendResponse.js";

export const createProject = expressAsyncHandler(async (req: Request, res: Response) => {
    const { git_url, project_id, root_folder, env_variables, name, access_token, branch, deployment_id } = req.body; 
    createJob(git_url, project_id, root_folder, JSON.parse(env_variables), branch, deployment_id, "rehman.khan.300a@gmail.com", access_token, name); 
    sendResponse(res, 200, {message: `Job completed successfully`, data: "Job created successfully"});

});