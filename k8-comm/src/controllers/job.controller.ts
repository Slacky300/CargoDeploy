import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import { createJob } from "../utils/k8job";
import { sendResponse } from "../utils/sendResponse";

export const createProject = expressAsyncHandler(async (req: Request, res: Response) => {
    const { git_url, project_id, root_folder, env_variables, name, access_token } = req.body; 

    await createJob(git_url, project_id, root_folder, env_variables, access_token); 
    //send an email to the user
    return sendResponse(res, 200, {message: `${name} workflow has started`});
});