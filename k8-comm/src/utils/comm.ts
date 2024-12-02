interface QueryProject{
    message?: string;
    success: boolean
}

const doesProjectExists = async (name: string, githubUrl: string, project_id: string): Promise<QueryProject> => {
    const res = await fetch(`${process.env.COMM_URL ?? "http://localhost:3000/api"}/projects/kubecomm?name=${name}&?githubUrl=${githubUrl}&?project_id=${project_id}`);
    const data =  await res.json();
    if(res.status === 200 && !data.exists) return {
        success: true
    };
    return {
        message: data.message,
        success: false
    }
}