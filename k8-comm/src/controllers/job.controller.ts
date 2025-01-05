import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import { createJob } from "../utils/k8job.js";
import { sendResponse } from "../utils/sendResponse.js";

export const createProject = expressAsyncHandler(async (req: Request, res: Response) => {
    const { git_url, project_id, root_folder, env_variables, name, access_token, branch, deploymentId } = req.body; 
    console.log(env_variables)

    const stats = await createJob(git_url, project_id, root_folder, env_variables, branch, deploymentId,access_token, name); 
    //send an email to the user
    return sendResponse(res, 200, {message: `Job completed successfully`, data: stats});
});