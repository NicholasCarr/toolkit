import fs from 'fs/promises';
import path from 'path';
import { getClient } from './database.js';
import logger from '../utils/logger.js';

const QUEUE_FILE = path.join(process.cwd(), 'data', 'jobQueue.json');
const ARCHIVE_FILE = path.join(process.cwd(), 'data', 'jobArchive.json');

// Job type definitions
const JOB_TYPES = {
    PHONE_CALL: 'phone_call',
    EMAIL: 'email',
    SMS: 'sms'
};

// Job status definitions
const JOB_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

// Job priority levels
const JOB_PRIORITY = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    URGENT: 4
};

class JobQueue {
    constructor() {
        this.queue = new Map();
        this.initialized = false;
        this.archive = new Map();
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            // Try to load existing queue from file
            const data = await fs.readFile(QUEUE_FILE, 'utf-8');
            const savedQueue = JSON.parse(data);
            this.queue = new Map(Object.entries(savedQueue));

            // Try to load existing archive
            const archiveData = await fs.readFile(ARCHIVE_FILE, 'utf-8');
            const savedArchive = JSON.parse(archiveData);
            this.archive = new Map(Object.entries(savedArchive));
        } catch (error) {
            // If files don't exist or are invalid, start with empty queue and archive
            this.queue = new Map();
            this.archive = new Map();
            await this.saveQueue();
            await this.saveArchive();
        }
        
        this.initialized = true;
    }

    async saveQueue() {
        const queueData = Object.fromEntries(this.queue);
        await fs.writeFile(QUEUE_FILE, JSON.stringify(queueData, null, 2));
    }

    async saveArchive() {
        const archiveData = Object.fromEntries(this.archive);
        await fs.writeFile(ARCHIVE_FILE, JSON.stringify(archiveData, null, 2));
    }

    validateJobSchema(job) {
        const requiredFields = {
            [JOB_TYPES.PHONE_CALL]: ['type', 'contact', 'retry_attempts'],
            [JOB_TYPES.EMAIL]: ['type', 'to', 'subject', 'content', 'attachments'],
            [JOB_TYPES.SMS]: ['type', 'contact', 'retry_attempts']
        };

        if (!job.type || !Object.values(JOB_TYPES).includes(job.type)) {
            throw new Error(`Invalid job type. Must be one of: ${Object.values(JOB_TYPES).join(', ')}`);
        }

        const fields = requiredFields[job.type];
        for (const field of fields) {
            if (!(field in job)) {
                throw new Error(`Missing required field '${field}' for job type ${job.type}`);
            }
        }

        // Validate specific job type fields
        switch (job.type) {
            case JOB_TYPES.PHONE_CALL:
                if (!job.contact?.phone_number || !/^\+?[1-9]\d{1,14}$/.test(job.contact.phone_number)) {
                    throw new Error('Invalid phone number format in contact object');
                }
                if (typeof job.retry_attempts !== 'number' || job.retry_attempts < 0) {
                    throw new Error('retry_attempts must be a non-negative number');
                }
                break;
            case JOB_TYPES.EMAIL:
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(job.to)) {
                    throw new Error('Invalid email address');
                }
                if (!Array.isArray(job.attachments)) {
                    throw new Error('attachments must be an array');
                }
                break;
            case JOB_TYPES.SMS:
                if (!/^\+?[1-9]\d{1,14}$/.test(job.contact.phone_number)) {
                    throw new Error('Invalid phone number format');
                }
                if (typeof job.retry_attempts !== 'number' || job.retry_attempts < 0) {
                    throw new Error('retry_attempts must be a non-negative number');
                }
                break;
        }
    }

    async getProcessingCount(account_id) {
        const companyQueue = this.queue.get(account_id) || [];
        return companyQueue.filter(job => job.status === JOB_STATUS.PROCESSING).length;
    }

    async addJob(client, job) {
        await this.initialize();
        
        // Validate job schema
        this.validateJobSchema(job);

        // Check if account job limit has been reached
        const jobLimit = client.jobs?.limit || 100;
        const companyQueue = this.queue.get(client.account_id) || [];
        if (companyQueue.length >= jobLimit) {
            return { success: false, message: `Job limit (${jobLimit}) reached for company ${client.account_id}` };
        }

        // Check if campaign is active
        const campaign = client.campaigns.find(campaign => campaign.status === 'active' && campaign.campaign_id === job?.campaign?.campaign_id);
        if (!campaign) {
            return { success: false, message: `Campaign ID: ${job?.campaign?.campaign_id} status ${campaign?.status} cannot be started for company ${client.account_id}` };
        }
       
        const newJob = {
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            ...job
        };

        companyQueue.push(newJob);
        this.queue.set(client.account_id, companyQueue);
        await this.saveQueue();
        
        return newJob;
    }

    async getJobs(account_id) {
        await this.initialize();
        return this.queue.get(account_id) || [];
    }

    async updateJobStatus(account_id, jobId, status, error = null) {
        await this.initialize();
        
        const companyQueue = this.queue.get(account_id);
        if (!companyQueue) {
            throw new Error(`No queue found for company ${account_id}`);
        }

        const jobIndex = companyQueue.findIndex(job => job.id === jobId);
        if (jobIndex === -1) {
            throw new Error(`Job ${jobId} not found for company ${account_id}`);
        }

        if (!Object.values(JOB_STATUS).includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${Object.values(JOB_STATUS).join(', ')}`);
        }

        companyQueue[jobIndex].status = status;
        companyQueue[jobIndex].updatedAt = new Date().toISOString();
        companyQueue[jobIndex].error = error;
        
        if (status === JOB_STATUS.PROCESSING) {
            companyQueue[jobIndex].attempts += 1;
            companyQueue[jobIndex].lastAttempt = new Date().toISOString();
        }

        // If job is completed, move it to archive
        if (status === JOB_STATUS.COMPLETED) {
            await this.archiveJob(account_id, companyQueue[jobIndex]);
            companyQueue.splice(jobIndex, 1);
        } else {
            this.queue.set(account_id, companyQueue);
        }
        
        await this.saveQueue();
        
        return companyQueue[jobIndex];
    }

    async removeJob(account_id, jobId) {
        await this.initialize();
        
        const companyQueue = this.queue.get(account_id);
        if (!companyQueue) {
            throw new Error(`No queue found for company ${account_id}`);
        }

        const filteredQueue = companyQueue.filter(job => job.id !== jobId);
        this.queue.set(account_id, filteredQueue);
        await this.saveQueue();
    }

    async getNextPendingJob(account_id) {
        await this.initialize();
        
        const companyConfig = await getClient(account_id);
        if (!companyConfig) {
            throw new Error(`Company ${account_id} not found`);
        }

        const concurrentLimit = companyConfig.jobs?.concurrent || 10;
        const currentProcessing = await this.getProcessingCount(account_id);
        
        if (currentProcessing >= concurrentLimit) {
            return null; // Already at concurrent processing limit
        }

        const companyQueue = this.queue.get(account_id);
        if (!companyQueue) return null;

        // Sort by priority and creation date
        const pendingJobs = companyQueue
            .filter(job => job.status === JOB_STATUS.PENDING)
            .sort((a, b) => {
                if (a.priority !== b.priority) {
                    return b.priority - a.priority;
                }
                return new Date(a.createdAt) - new Date(b.createdAt);
            });

        return pendingJobs[0] || null;
    }

    async getQueueStats(account_id) {
        await this.initialize();
        
        const companyQueue = this.queue.get(account_id) || [];
        const companyConfig = await getClient(account_id);
        
        return {
            total: companyQueue.length,
            pending: companyQueue.filter(job => job.status === JOB_STATUS.PENDING).length,
            processing: companyQueue.filter(job => job.status === JOB_STATUS.PROCESSING).length,
            completed: companyQueue.filter(job => job.status === JOB_STATUS.COMPLETED).length,
            failed: companyQueue.filter(job => job.status === JOB_STATUS.FAILED).length,
            cancelled: companyQueue.filter(job => job.status === JOB_STATUS.CANCELLED).length,
            limits: {
                total: companyConfig?.jobs?.limit || 100,
                concurrent: companyConfig?.jobs?.concurrent || 10
            }
        };
    }

    async archiveJob(account_id, job) {
        const companyArchive = this.archive.get(account_id) || [];
        companyArchive.push({
            ...job,
            archivedAt: new Date().toISOString()
        });
        this.archive.set(account_id, companyArchive);
        await this.saveArchive();
    }
}

export const jobQueue = new JobQueue();
export { JOB_TYPES, JOB_STATUS, JOB_PRIORITY }; 