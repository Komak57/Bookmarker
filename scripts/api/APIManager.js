importScripts('/scripts/api/jikan-anime.js');
importScripts('/scripts/api/jikan-manga.js');
importScripts('/scripts/api/default.js');
// log('log', 'APIClass Objects: ', APIClass.getAllSubclasses());
// ====================================
// Rate Limit Logic
// ====================================
class ThrottledQueue {
    constructor(parent) {
        this.lastRequest = 0;
        this.queue = [];
        this.isProcessing = false;
        this.parent = parent;
    }

    enqueue(api_call, details, tab, settings) {
        this.queue.push({ api_call, details, tab, settings });
        this.processQueue();
    }

    async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.queue.length > 0) {
            const task = this.queue.shift();
            // Calculate remaining delay time
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequest;
            if (timeSinceLastRequest < task.api_call.delay) {
                // Wait an exact time
                const waitTime = task.api_call.delay - timeSinceLastRequest;
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            const api_data = await task.api_call.fetch(task.details, task.tab, task.settings);

            // Update execution time
            this.lastRequest = Date.now();

            log('log', `Processing addEpisode Request`);
            this.parent.addEpisodeToStorage(api_data, task.tab, task.settings);
        }

        this.isProcessing = false;
    }
}
// ====================================
// API Manager
// ====================================
class APIManager {
    constructor(parent) {
        this.parent = parent;
        // Set throttling delays for different APIs here (they can run in parallel)
        this.queues = {};
        // Procedurally add all APIClass extended classes.
        // for (const [key, cls] of Object.entries(APIClass.getAllSubclasses())) {
        //     this.queues[cls.throttle] = new ThrottledQueue(this.parent);
        // }
        for (const [key, cls] of Object.entries(APIClass.classes)) {
            // APIClass.getAllSubclasses().forEach((cls) => {
            this.queues[cls.throttle] = new ThrottledQueue(this.parent);
            // });
        }
        // this.queues = {
        //     jikan: new ThrottledQueue(this.parent),
        //     default: new ThrottledQueue(this.parent)
        // };
    }

    async request(details, tab, settings) {
        const api_call = APIClass.classes[settings.a];
        // Queue the API for a future fetch, and then send out an addEpisode message to background.js
        this.queues[api_call.throttle].enqueue(api_call, details, tab, settings);

    }
};