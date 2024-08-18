const k8s = require('@kubernetes/client-node');
const { v4: uuidv4 } = require('uuid'); 

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const batchApi = kc.makeApiClient(k8s.BatchV1Api);

const createJob = async () => {
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
                        job: jobName,
                    },
                },
                spec: {
                    containers: [
                        {
                            name: 's3-upload-container',
                            image: 'rehman300/container-deploy:v0.3',
                            env: [
                                { name: 'GIT_REPOSITORY__URL', value: 'https://github.com/Saurabh-Rana17/sewer-monitoring-system-client.git' },
                                { name: 'PROJECT_ID', value: 'p9' },
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
        console.log(`Job ${jobName} created successfully`);
    } catch (err) {
        console.error('Error creating Job:', err);
        throw err;
    }
};

const main = async () => {
    await createJob();
};

main().catch((err) => console.error('Script failed:', err));
