// ====================================
// API Data Structure
// ====================================
class DataStruct {
    constructor(id = 0, c = 0, d = 0, f = 0, t = '', e = 0, r = 0, n = null, p = '', l = 'tab.url', u = Date.now(), error = '') {
        this.id = id;
        this.c = c; // Anime
        this.d = d;
        this.f = f;
        this.t = t;
        this.e = e;
        this.r = r;
        this.n = n;
        this.p = p;
        this.l = l; // URL Last Viewed
        this.u = u; // Track the time it was viewed
        this.error = error;
    }
}
// ====================================
// API Class Structure
// ====================================
class APIClass {
    static throttle = 'default';
    static delay = 0;
    async fetch(details, tab, settings) {
        log('warn', 'fetch() not implemented');
        return null;
    }
}
importScripts('/scripts/api/jikan-anime.js');
importScripts('/scripts/api/jikan-manga.js');
importScripts('/scripts/api/default.js');
// ====================================
// API Manager
// ====================================
class APIManager {
    constructor(parent) {
        this.parent = parent;
        // Set throttling delays for different APIs here (they can run in parallel)
        this.queues = {
            jikan: new ThrottledQueue(this.parent),
            default: new ThrottledQueue(this.parent),
        };
    }

    async request(category, details, tab, settings) {
        let api_call = new APIClass();
        switch (category) {
            case 'Anime':
                api_call = new JIKAN_Anime();
                break;
            case 'Manga':
                api_call = new JIKAN_Manga();
                break;
            case 'Movies':
                // Movies not supported yet. Treat as "Other"
            case 'Other':
                // Default is "Other"
            default:
                api_call = new DefaultAPI();
                break;
        }
        // Queue the API for a future fetch, and then send out an addEpisode message to background.js
        this.queues[api_call.throttle].enqueue(api_call, details, tab, settings);

    }
};

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
            const _settings = task.settings;
            // Force the update of all API details
            _settings['cloud'] = true;
            this.parent.addEpisodeToStorage(api_data, task.tab, _settings);
        }

        this.isProcessing = false;
    }
}