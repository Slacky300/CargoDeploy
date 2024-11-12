import k8s from '@kubernetes/client-node';
import { v4 as uuidv4 } from 'uuid';
import logger from '../logger.js';

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const batchApi = kc.makeApiClient(k8s.BatchV1Api);
const coreApi = kc.makeApiClient(k8s.CoreV1Api);

const getContainerLogs = async (podNamespace: string, podName: string, containerName: string) => {
    try {
        const podLogs = await coreApi.readNamespacedPodLog(podName, podNamespace, containerName, true);
        logger.info(`Logs from container ${containerName} in pod ${podName}:\n${podLogs.body}`);
    } catch (error) {
        logger.error(`Error fetching logs for container ${containerName}:`, error);
    }
};

const getPodName = async (jobName: string): Promise<string> => {
    try {
        const labelSelector = `job-name=${jobName}`;
        const pods = await coreApi.listNamespacedPod('default', undefined, undefined, undefined, undefined, labelSelector);

        if (pods.body.items.length === 0) {
            logger.error('No pods found for the job');
            return '';
        }

        return pods.body.items[0].metadata?.name || '';
    } catch (error) {
        logger.error('Error fetching pod name:', error);
        return '';
    }
};

const waitForPodReady = async (podName: string, namespace = 'default') => {
    let podReady = false;
    while (!podReady) {
        const pod = await coreApi.readNamespacedPod(podName, namespace);
        const phase = pod.body.status?.phase;
        const containerStatuses = pod.body.status?.containerStatuses || [];
        const containersReady = containerStatuses.every(status => status.ready);

        if (phase === 'Running' && containersReady) {
            podReady = true;
        } else if (phase === 'Succeeded' || phase === 'Failed') {
            // Pod has completed or failed, stop waiting
            podReady = true;
        } else {
            logger.info(`Waiting for pod ${podName} to be ready...`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
        }
    }
};

const getPodLogs = async (podName: string): Promise<void> => {
    try {
        if (!podName) {
            logger.error('Pod name is undefined');
            return;
        }

        await waitForPodReady(podName, 'default');

        const logs = await coreApi.readNamespacedPodLog(podName, 'default');
        logger.info(`Logs from pod ${podName}:\n${logs.body}`);
    } catch (error) {
        logger.error('Error fetching pod logs:', error);
        throw error;
    }
};

export const createJob = async (
    git_url: string,
    project_id: string,
    root_folder: string,
    env_variables: Array<{ name: string, value: string }>, // Accepting environment variables
): Promise<void> => {
    const uniqueId = uuidv4();
    const jobName = `s3-upload-job-${uniqueId}`;

    const job = {
        apiVersion: 'batch/v1',
        kind: 'Job',
        metadata: {
            name: jobName,
        },
        spec: {
            template: {
                metadata: {
                    labels: {
                        'job-name': jobName,
                    },
                },
                spec: {
                    containers: [
                        {
                            name: 's3-upload-container',
                            image: 'rehman300/container-deploy:v0.3',
                            env: [
                                { name: 'GIT_REPOSITORY__URL', value: git_url },
                                { name: 'PROJECT_ID', value: project_id },
                                { name: 'SOURCE_DIRECTORY', value: root_folder },
                                ...env_variables.map(envVar => ({ name: envVar.name, value: envVar.value }))
                            ],
                        },
                    ],
                    restartPolicy: 'Never',
                },
            },
            backoffLimit: 4,
        },
    };

    try {
        await batchApi.createNamespacedJob('default', job);
        logger.info(`Job ${jobName} created successfully`);

        const podName = await getPodName(jobName);
        if (!podName) {
            throw new Error('Pod name is undefined');
        }

        await getPodLogs(podName);
        await getContainerLogs('default', podName, 's3-upload-container');

    } catch (err) {
        logger.error('Error creating Job:', err);
        throw err;
    }
};
