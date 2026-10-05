const crypto = require('crypto');
const SmsProvider = require('./providers/sms');
const PushProvider = require('./providers/push');
const EmailProvider = require('./providers/email');
const config = require('../../config');

class NotificationQueue {
  constructor() {
    this.redisUrl = config.redis?.url || process.env.REDIS_URL;
    this.isRedisMode = Boolean(this.redisUrl);

    // In-memory queue state
    this.pendingJobs = [];
    this.completedJobs = [];
    this.failedJobs = [];
    this.inFlightCount = 0;
    this.isProcessing = false;
    this.maxRetries = 3;

    // BullMQ handles if Redis is present
    this.bullQueue = null;
    this.bullWorker = null;

    if (this.isRedisMode) {
      try {
        const { Queue, Worker } = require('bullmq');
        this.bullQueue = new Queue('notifications', {
          connection: { url: this.redisUrl },
        });
        this.bullWorker = new Worker(
          'notifications',
          async (job) => {
            return this.dispatchJob(job.name, job.data);
          },
          { connection: { url: this.redisUrl } }
        );
        console.log('[NotificationQueue] Initialized BullMQ queue with Redis:', this.redisUrl);
      } catch (err) {
        console.warn('[NotificationQueue] Failed to initialize BullMQ with Redis, falling back to in-memory queue:', err.message);
        this.isRedisMode = false;
      }
    }
  }

  /**
   * Dispatches a job payload to the appropriate provider
   */
  async dispatchJob(type, data) {
    switch (type) {
      case 'sms':
        return SmsProvider.send(data);
      case 'push':
        return PushProvider.send(data);
      case 'email':
        return EmailProvider.send(data);
      default:
        throw new Error(`Unknown notification job type: ${type}`);
    }
  }

  /**
   * Enqueues a notification job (non-blocking)
   * @param {string} type - 'sms' | 'push' | 'email'
   * @param {object} data - job data
   * @param {object} [options]
   * @returns {Promise<object>} job descriptor
   */
  async enqueue(type, data, options = {}) {
    const jobId = options.jobId || `job_${type}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const maxRetries = options.retries !== undefined ? options.retries : this.maxRetries;

    if (this.isRedisMode && this.bullQueue) {
      const bullJob = await this.bullQueue.add(type, data, {
        jobId,
        attempts: maxRetries,
        backoff: { type: 'exponential', delay: 1000 },
        ...options,
      });
      return { id: bullJob.id, type, data, status: 'queued', mode: 'bullmq' };
    }

    // In-memory queue
    const job = {
      id: jobId,
      type,
      data,
      attempts: 0,
      maxRetries,
      status: 'pending',
      error: null,
      result: null,
      createdAt: new Date().toISOString(),
    };

    this.pendingJobs.push(job);
    this._processNext();

    return { id: job.id, type, data, status: 'pending', mode: 'in-memory' };
  }

  /**
   * Convenience enqueue helpers
   */
  async enqueueSms(to, message, metadata = {}) {
    return this.enqueue('sms', { to, message, metadata });
  }

  async enqueuePush(recipient, notification, data = {}) {
    return this.enqueue('push', { recipient, notification, data });
  }

  async enqueueEmail(to, subject, body, metadata = {}) {
    return this.enqueue('email', { to, subject, body, metadata });
  }

  /**
   * Internal processor for in-memory queue
   */
  async _processNext() {
    if (this.pendingJobs.length === 0) {
      return;
    }

    const job = this.pendingJobs.shift();
    if (!job) return;

    this.inFlightCount += 1;
    job.status = 'processing';

    this._executeJobWithRetry(job)
      .finally(() => {
        this.inFlightCount -= 1;
        if (this.pendingJobs.length > 0) {
          this._processNext();
        }
      });
  }

  /**
   * Execute job with retry logic (maxRetries = 3)
   */
  async _executeJobWithRetry(job) {
    while (job.attempts < job.maxRetries) {
      job.attempts += 1;
      try {
        const result = await this.dispatchJob(job.type, job.data);
        job.status = 'completed';
        job.result = result;
        job.completedAt = new Date().toISOString();
        this.completedJobs.push(job);
        return;
      } catch (err) {
        job.error = err.message;
        if (job.attempts >= job.maxRetries) {
          job.status = 'failed';
          job.failedAt = new Date().toISOString();
          this.failedJobs.push(job);
          return;
        }
        // Brief backoff before retry
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
    }
  }

  /**
   * Waits for all pending and in-flight jobs in the queue to settle
   */
  async drain() {
    if (this.isRedisMode && this.bullQueue) {
      await this.bullQueue.drain();
      return;
    }

    // Wait until both pending queue is empty and in-flight count reaches zero
    while (this.pendingJobs.length > 0 || this.inFlightCount > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  /**
   * Non-blocking helper to dispatch order life-cycle notifications
   * @param {object} order
   * @param {'placed'|'accepted'|'ready'|'delivered'} eventType
   */
  notifyOrderEvent(order, eventType) {
    if (!order) return;

    const orderId = order.id || order.orderId;
    const orderNumber = order.orderNumber || orderId;
    const customerId = order.customerId || 'cust_default';
    const customerPhone = order.customerPhone || order.phone || '9999999999';

    // Dispatches non-blockingly without throwing
    try {
      switch (eventType) {
        case 'placed':
          this.enqueuePush(customerId, {
            title: 'Order Placed!',
            body: `Your order #${orderNumber} has been received.`,
          }, { orderId, eventType }).catch(() => {});

          this.enqueueSms(customerPhone, `Quikooo: Order #${orderNumber} placed successfully!`, {
            orderId,
            eventType,
          }).catch(() => {});
          break;

        case 'accepted':
          this.enqueuePush(customerId, {
            title: 'Order Accepted',
            body: `The restaurant has accepted your order #${orderNumber} and started cooking.`,
          }, { orderId, eventType }).catch(() => {});
          break;

        case 'ready':
          this.enqueuePush(customerId, {
            title: 'Order Ready',
            body: `Your order #${orderNumber} is packaged and ready for pickup/dispatch.`,
          }, { orderId, eventType }).catch(() => {});
          break;

        case 'delivered':
          this.enqueuePush(customerId, {
            title: 'Order Delivered!',
            body: `Your order #${orderNumber} has been delivered. Enjoy your meal!`,
          }, { orderId, eventType }).catch(() => {});

          this.enqueueSms(customerPhone, `Quikooo: Order #${orderNumber} is delivered. Thank you!`, {
            orderId,
            eventType,
          }).catch(() => {});
          break;

        default:
          break;
      }
    } catch (err) {
      console.warn(`[NotificationQueue] Non-blocking notifyOrderEvent error: ${err.message}`);
    }
  }

  /**
   * Reset in-memory queue state (useful for tests)
   */
  clear() {
    this.pendingJobs = [];
    this.completedJobs = [];
    this.failedJobs = [];
    this.inFlightCount = 0;
  }

  getCompletedJobs() {
    return this.completedJobs;
  }

  getFailedJobs() {
    return this.failedJobs;
  }

  getPendingJobs() {
    return this.pendingJobs;
  }
}

// Global singleton instance
const defaultQueue = new NotificationQueue();

module.exports = defaultQueue;
module.exports.NotificationQueue = NotificationQueue;
