import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import { createJob } from "../utils/k8job";
import { sendResponse } from "../utils/sendResponse";

export const createProject = expressAsyncHandler(async (req: Request, res: Response) => {
    const { git_url, project_id, root_folder, env_variables, name } = req.body; 

    const flag =  await doesProjectExists(name,git_url,project_id);

    if(flag) return sendResponse(res, 403, {message: flag.message});

    await createJob(git_url, project_id, root_folder, env_variables); 
    //send an email to the user
    return sendResponse(res, 200, {message: `${name} workflow has started`});
});