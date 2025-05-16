import { jobQueue, JOB_TYPES, JOB_STATUS } from '../data/jobQueue.js';
import { dispatchAgent } from '../services/livekit.js';
import { updateContact } from '../services/hubspot.js';
import logger from '../utils/logger.js';
import { getClient } from '../data/database.js';

class JobEngine {
    constructor() {
        this.isRunning = false;
        this.processingInterval = 60000; // Process jobs every 5 minutes
        this.processingTimer = null;
    }

    async start() {
        if (this.isRunning) {
            logger.warn('Job engine is already running');
            return;
        }

        // Initialize the job queue
        await jobQueue.initialize();
        
        this.isRunning = true;
        logger.info('Starting job engine');
        await this.processJobs();
    }

    stop() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        if (this.processingTimer) {
            clearTimeout(this.processingTimer);
            this.processingTimer = null;
        }
        logger.info('Job engine stopped');
    }

    async processJobs() {
        if (!this.isRunning) {
            return;
        }

        try {
            // Get all clients from the queue
            const clients = Array.from(jobQueue.queue.keys());            
            for (const account_id of clients) {
                try {
                    const companyConfig = await getClient(account_id);
                    if (!companyConfig) {
                        logger.error(`Company ${account_id} not found`);
                        continue;
                    }

                    // Get all pending jobs for this client
                    const companyQueue = await jobQueue.getJobs(account_id);
                    const pendingJobs = companyQueue
                        .filter(job => job.status === JOB_STATUS.PENDING)
                        .sort((a, b) => {
                            if (a.priority !== b.priority) {
                                return b.priority - a.priority;
                            }
                            return new Date(a.createdAt) - new Date(b.createdAt);
                        });

                    // Get count of currently processing jobs
                    let currentProcessing = companyQueue.filter(job => job.status === JOB_STATUS.PROCESSING).length;
                    const concurrentLimit = companyConfig.jobs?.concurrent || 10;

                    // Process all pending jobs that can be processed within concurrent limit
                    for (const job of pendingJobs) {
                        // If we're at the concurrent limit, stop processing more jobs
                        if (currentProcessing >= concurrentLimit) {
                            logger.info(`Reached concurrent limit of ${concurrentLimit} for company ${account_id}`);
                            break;
                        }
                        
                        // Check campaign timezone and if campaign is scheduled to run
                        const schedule = job?.schedule;
                        const timezone = schedule?.timezone || 'UTC';                        
                        // Convert current UTC time to campaign's timezone
                        const time = new Date().toLocaleString('en-US', { timeZone: timezone });
                        const date = new Date(time);
                        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: timezone }).toLowerCase();
                        const currentHour = date.getHours();
                        logger.info(`Job timezone: ${timezone}, days: ${schedule?.days}, hours: ${schedule?.hours?.start} - ${schedule?.hours?.end}`);
                        logger.info(`Job UTC day: ${dayOfWeek} @ ${currentHour}`);
                        // Get server UTC time
                        const serverDate = new Date();
                        const serverDay = serverDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase();
                        const serverHour = serverDate.getUTCHours();
                        logger.info(`Server UTC day: ${serverDay} @ ${serverHour}`);                        
                        if (!schedule?.days?.includes(dayOfWeek)) {
                            logger.info(`Skipping job ID: ${job?.id} outside schedule days: ${schedule?.days}`);
                            continue;
                        }                        
                        // Convert schedule hours to numbers for comparison
                        const startHour = parseInt(schedule?.hours?.start.split(':')[0], 10);
                        const endHour = parseInt(schedule?.hours?.end.split(':')[0], 10);
                        if (currentHour < startHour || currentHour >= endHour) {
                            logger.info(`Skipping job ID: ${job?.id} outside schedule hours: ${schedule?.hours?.start} - ${schedule?.hours?.end}`);
                            continue;
                        }
                        // Process job if it's within the schedule
                        if (schedule?.days?.includes(dayOfWeek) && currentHour >= startHour && currentHour < endHour) {
                            await this.processJob(job, account_id);
                            currentProcessing++; // Increment the processing count after starting a job
                        }
                    }
                } catch (error) {
                    logger.error(`Error processing jobs for account ${account_id}:`, error);
                }
            }
        } catch (error) {
            logger.error('Error in job processing cycle:', error);
        }

        // Schedule next processing cycle
        this.processingTimer = setTimeout(() => this.processJobs(), this.processingInterval);
    }

    async processJob(job, account_id) {
        // logger.info(`Processing job ${job.id} of type ${job.type}`);

        // Update job status to processing
        await jobQueue.updateJobStatus(account_id, job.id, JOB_STATUS.PROCESSING);

        try {
            switch (job.type) {
                case JOB_TYPES.PHONE_CALL:
                    await this.processPhoneCall(job);
                    break;
                case JOB_TYPES.SMS:
                    await this.processSMS(job);
                    break;
                default:
                    throw new Error(`Unknown job type: ${job.type}`);
            }

            // Mark job as completed
            await jobQueue.updateJobStatus(account_id, job.id, JOB_STATUS.COMPLETED);
            logger.info(`Job ${job.id} completed successfully`);
        } catch (error) {
            throw error;
        }
    }

    async processPhoneCall(job) {
        // TODO: Implement actual phone call logic
        logger.info(`Making phone call to ${job.contact.phone_number}`);
        
        // CHANGE TO IN PROGRESS
        const contact = {account_id: job.account.account_id, hs_contact_id: job.contact.id, properties: {ai_campaign_status: 'Processing'}};
        await updateContact(contact);
        // Simulate phone call processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // DISPATCH AGENT
        const dispatch = await dispatchAgent(job);
        if (dispatch.success) {
            logger.info(`Phone call completed for job ${job.id}`);
            const contact = {account_id: job.account.account_id, hs_contact_id: job.contact.id, properties: {ai_campaign_status: 'Completed'}};
            await updateContact(contact);
        } else {
            logger.error(`Phone call failed for job ${job.id}`);
            const contact = {account_id: job.account.account_id, hs_contact_id: job.contact.id, properties: {ai_campaign_status: 'Failed'}};
            await updateContact(contact);
        }
        
    }

    async processSMS(job) {
        // TODO: Implement actual SMS sending logic
        logger.info(`Sending SMS to ${job.phoneNumber} with message: ${job.message}`);
        
        // Simulate SMS sending
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For now, just log the action
        logger.info(`SMS sent for job ${job.id}`);
    }

    async handleJobError(job, account_id, error) {
        const retryCount = (job.retryCount || 0) + 1;
        
        if (retryCount <= job.retryAttempts) {
            // Update retry count and set back to pending
            await jobQueue.updateJob(account_id, job.id, {
                retryCount,
                status: JOB_STATUS.PENDING
            });
            logger.info(`Job ${job.id} will be retried (attempt ${retryCount}/${job.retryAttempts})`);
        } else {
            // Mark job as failed after all retries
            await jobQueue.updateJobStatus(account_id, job.id, JOB_STATUS.FAILED);
            logger.error(`Job ${job.id} failed after ${retryCount} attempts:`, error);
        }
    }
}

export const jobEngine = new JobEngine(); 