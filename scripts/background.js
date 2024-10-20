chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === "update") {
        const currentVersion = chrome.runtime.getManifest().version;

        console.log("Attempting to update outdated variables for v", currentVersion);
        VersionUpdate();
    }
});

// Handle messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'trackDomain') {
        trackDomain(request.domain);
    }
});
// Handle messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'trackEpisode') {
        console.log(`Domain Tracking Requested: ${request.domain}`);

        chrome.storage.local.get('trackedDomains', (data) => {
            const trackedDomains = data.trackedDomains || [];
            const settings = trackedDomains[request.domain];
            //settings.obtainTitleFrom = ((trackedDomains[request.domain].obtainTitleFrom == "URL") ? 1 : ((trackedDomains[request.domain].obtainTitleFrom == "Tab Text") ? 2 : 3));

            // Inject script into the current tab to get document content
            chrome.scripting.executeScript({
                target: { tabId: request.id },
                func: getDocumentContent, // The function to be executed in the content script
                args: [settings]
            }, (results) => {
                console.log('Script Injection Complete.');
                if (results) {
                    if (results[0]) {
                        const documentContent = results[0].result;
                        console.log('Document content retrieved. ', documentContent);

                        trackEpisode(request.domain, documentContent, { id: request.id, url: request.url, title: request.title }, settings);
                    }
                }
            });
            sendResponse({ status: "success" });
        });
    }
});

// Listener for tab updates (i.e., when a page change edits the tab without reloading)
// chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {
//     const domain = getDomainFromUrl(details.url);
//     console.log(`Domain Page Updated: '${domain}' frameId: ${details.frameId} tabID: ${details.tabId}`);
//     //if (details.frameId === 0) { // Ensure it's the top-level frame
//     //const domain = getDomainFromUrl(details.url);
//     console.log(`Domain Page Updated: ${domain}`);
//     chrome.tabs.get(details.tabId, function(tab) {

//         // Check if this domain is tracked
//         chrome.storage.local.get('trackedDomains', (data) => {
//             const trackedDomains = data.trackedDomains || [];

//             if (domain in trackedDomains) {
//                 const settings = trackedDomains[domain];
//                 //settings.obtainTitleFrom = ((trackedDomains[domain].obtainTitleFrom == "URL") ? 1 : ((trackedDomains[domain].obtainTitleFrom == "Tab Text") ? 2 : 3));

//                 // Inject script into the current tab to get document content
//                 chrome.scripting.executeScript({
//                     target: { tabId: details.tabId },
//                     func: getDocumentContent, // The function to be executed in the content script
//                     args: [settings]
//                 }, (results) => {
//                     console.log('Script Injection Complete.');
//                     if (results) {
//                         if (results[0]) {
//                             const documentContent = results[0].result;
//                             console.log('Document content retrieved. ', documentContent);
//                             // Handle the retrieved document content here
//                             // Track the episode from the URL if the domain is being tracked
//                             addEpisodeToStorage(domain, documentContent, { id: tab.id, url: tab.url, title: tab.title }, settings);
//                         }
//                     }
//                 });
//                 // addEpisodeToStorage(domain, document, tab, settings);
//             }
//         });
//     });
//     //}
// });

function delayExecution(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function asyncGetDomains() {
    return new Promise((resolve, reject) => {
        // Load tracked domains
        chrome.storage.local.get('trackedDomains', function(data) {
            if (chrome.runtime.lastError)
                reject(chrome.runtime.lastError);
            else
                resolve(data.trackedDomains || []);
        });
    });
}
// Listener for tab updates (i.e., when a user navigates to a new page)
chrome.tabs.onUpdated.addListener(async(tabId, changeInfo, tab) => {
    // console.log(`Domain Page ${changeInfo.status}: ${tab.url}`);
    if (changeInfo.status === 'complete' && tab.url) {
        const domain = getDomainFromUrl(tab.url);
        console.log(`Domain Page Loaded: ${domain}`);
        let trackedDomains = await asyncGetDomains();

        // Check if this domain is tracked
        if (domain in trackedDomains) {
            const settings = trackedDomains[domain];

            if (settings.obtainTitleFrom == 2 || settings.obtainSeasonFrom == 2 || settings.obtainEpisodeFrom == 2) {
                // Wait for dynamic changes to finish (Crunchyroll)
                await delayExecution(3000);
                // Get current content
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: getDocumentContent, // The function to be executed in the content script
                    args: [settings]
                }, (results) => {
                    if (chrome.runtime.lasterror) {
                        console.error('Script Injection Error: ', chrome.runtime.lastError.message);
                    } else {
                        console.log('Script Injection Complete.');
                    }
                    if (results) {
                        if (results[0]) {
                            const documentContent = results[0].result;
                            console.log('Current Document content retrieved. ', documentContent);

                            addEpisodeToStorage(domain, documentContent, tab, settings);
                        }
                    }
                });

            } else {
                // If we don't need content from the page, just add it with what we have
                addEpisodeToStorage(domain, { title: 'ignored', season: 'ignored', episode: 'ignored' }, tab, settings);
            }
        }
    }
});

// The function that will run in the context of the content script
function getDocumentContent(settings) {
    const data = {
        title: 'ignored',
        season: 'ignored',
        episode: 'ignored'
    }

    console.log('Querying for content.');
    try {
        // Example: Get the inner HTML of the body (you can modify this as needed)
        if (settings.titleHtmlQueryMatch) {

            try {
                data.title = document.querySelector(settings.titleHtmlQueryMatch).innerText;
            } catch (err) {
                if (err.name == "SyntaxError") {
                    const match = document.body.innerHTML.match(new RegExp(settings.titleHtmlQueryMatch, 'i'));
                    if (match)
                        data.title = match[0];
                    else
                        data.title = "Match Not Found";
                } else
                    data.title = err.message;
            }
            if (!data.title)
                data.title = "Match was Empty";
        }
        // Example: Get the inner HTML of the body (you can modify this as needed)
        if (settings.seasonHtmlQueryMatch) {
            try {
                data.season = document.querySelector(settings.seasonHtmlQueryMatch).innerText;
            } catch (err) {
                if (err.name == "SyntaxError") {
                    const match = document.body.innerHTML.match(new RegExp(settings.seasonHtmlQueryMatch, 'i'));
                    if (match)
                        data.season = match[0];
                    else
                        data.season = "Match Not Found";
                } else
                    data.season = err.message;
            }
            if (!data.season)
                data.season = "Match was Empty";
        }
        // Example: Get the inner HTML of the body (you can modify this as needed)
        if (settings.episodeHtmlQueryMatch) {
            try {
                data.episode = document.querySelector(settings.episodeHtmlQueryMatch).innerText;
            } catch (err) {
                //if (err instanceof SyntaxError)
                if (err.name == "SyntaxError") {
                    const match = document.body.innerHTML.match(new RegExp(settings.episodeHtmlQueryMatch, 'i'));
                    if (match)
                        data.episode = match[0];
                    else
                        data.episode = "Match Not Found";
                } else
                    data.episode = `${err.name}: ${err.message}`;
            }
            if (!data.episode)
                data.episode = "Match was Empty";
        }
    } catch (error) {
        console.log('Unable to query document.');
        data.title = `${error.name}: ${error.message}`;
        data.season = error.stack;
    }
    return data;
}

// Call the function to inject the content script (needed to search page for details)
//injectContentScript();

// Function to display a warning notification
function showWarningNotification(title, season, episode) {
    const notificationOptions = {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('./icons/warning-icon.png'), // Add your own icon here
        title: 'Non-sequential Episode Detected!',
        message: `The episode you are viewing is not sequential.\nTitle: ${title}\nSeason: ${season}\nEpisode: ${episode}`,
        priority: 2,
        requireInteraction: true //optional
    };

    chrome.notifications.create('EpisodeSkippedWarning', notificationOptions, (notificationId) => {
        if (chrome.runtime.lastError) {
            console.error('Notification creation failed:', chrome.runtime.lastError.message);
        } else {
            console.log('Notification created with ID:', notificationId);
        }
    });
}

// Function to get domain from URL
function getDomainFromUrl(url) {
    const urlObj = new URL(url);
    const subRegex = /^(?:[^.]+\.)?([^.]+\.[^/]+.*$)/i;
    return urlObj.hostname.replace(subRegex, "$1");
}

function normalizeUrl(url) {
    return url.trim().toLowerCase(); // Normalize URL
}

// Function to determine if the episode is greater than 1
function isEpisodeSequential(a, b) {
    const a_match = String(a).match(/(\d+)([a-z]?)$/);
    const b_match = String(b).match(/(\d+)([a-z]?)$/);

    const a_ep = parseInt(a_match[1]);
    const a_sfx = a_match[2];

    const b_ep = parseInt(b_match[1]);
    const b_sfx = b_match[2];

    // If we had a suffix...
    if (b_sfx) {
        // But now we don't...
        if (b_sfx)
            return a_ep == b_ep + 1; // Only allow if we incremented the episode
        // else, only allow sequential letters
        return a_sfx.charCodeAt(0) == b_sfx.charCodeAt(0);
    } else {
        return a_ep == b_ep + 1;
    }
}

// Define some regex patterns to identify season and episode
const yearRegex = /[^a-z0-9]\b([12][90][0-9][0-9])\b[^a-z0-9]/i;
const seasonRegex_Rigid = /(?:(?:season|s)(\d+)|(\d+)[- ]?(?:th|rd|nd|st)?[- ]?(season|s))/i;
//const seasonRegex_Soft = /(?:[^\d]|^)(\d+)[- ]?(?:th|nd|st)?[- ]?season(?:[^\d]|$)/i;
const episodeRegex_Rigid = /(?:episode|ep|e|part|chapter|ch)?[- ]?(\d+[a-z]?)$\b/i;
const episodeRegex_Simple = /(?:episode|ep|e|part|chapter|ch)[- ]?(\d+[a-z]?)\b/i;
const episodeRegex_Soft = /\b(\d+[a-z]?)\b/i;

function getDetails(domain, document, tab, settings) {
    let data = {
        matched: false,
        season: null,
        episode: null,
        completed: false,
        title: null
    }
    switch (parseInt(settings.obtainSeasonFrom)) {
        case 0:
            console.log(`Parsing Season from URL`);
            getSeasonDetails(data, new URL(tab.url).pathname, settings);
            break;
        case 1:
            console.log(`Parsing Season from Title`);
            getSeasonDetails(data, tab.title.trim(), settings);
            break;
        case 2:
            console.log(`Parsing Season from Selector`);
            getSeasonDetails(data, document.season.trim(), settings);
            break;
        default:
            console.log(`ERROR: obtainSeasonFrom = '${settings.obtainSeasonFrom}'`);
            settings['obtainSeasonFrom'] = 0;
            console.log(`Parsing Season from URL`);
            getSeasonDetails(data, new URL(tab.url).pathname, settings);
    }
    console.log(`Season Match: '${data.season}'`);
    switch (parseInt(settings.obtainEpisodeFrom)) {
        case 0:
            console.log(`Searching Episode using: '${new URL(tab.url).pathname}'`);
            getEpisodeDetails(data, new URL(tab.url).pathname, settings);
            break;
        case 1:
            console.log(`Searching Episode using: '${tab.episode.trim()}'`);
            getEpisodeDetails(data, tab.episode.trim(), settings);
            break;
        case 2:
            console.log(`Searching Episode using: '${document.episode.trim()}'`);
            getEpisodeDetails(data, document.episode.trim(), settings);
            break;
        default:
            console.log(`ERROR: obtainEpisodeFrom = '${settings.obtainEpisodeFrom}'`);
            settings['obtainEpisodeFrom'] = 0;
            console.log(`Searching Episode using: '${new URL(tab.url).pathname}'`);
            getEpisodeDetails(data, new URL(tab.url).pathname, settings);
    }
    console.log(`Episode Match: '${data.episode}'`);
    switch (parseInt(settings.obtainTitleFrom)) {
        case 0:
            console.log(`Parsing Title from URL`);
            getTitleDetails(data, new URL(tab.url).pathname, settings);
            break;
        case 1:
            console.log(`Parsing Title from Title`);
            getTitleDetails(data, tab.title.trim(), settings);
            break;
        case 2:
            console.log(`Parsing Title from Selector`);
            getTitleDetails(data, document.title.trim(), settings);
            break;
        default:
            console.log(`ERROR: obtainTitleFrom = '${settings.obtainTitleFrom}'`);
            settings['obtainTitleFrom'] = 0;
            console.log(`Parsing Title from URL`);
            getTitleDetails(data, new URL(tab.url).pathname, settings);
    }
    console.log(`Title Match: '${data.title}'`);
    return data;
}

// Function to extract a unique Title
// NOTE: Soft match can match YEAR or SEASON in the title
function getTitleDetails(data, context, settings) {
    // console.log(`Title Search: '${context}'`);
    let cleanPath = context;
    if (settings.obtainTitleFrom == settings.obtainEpisodeFrom)
        cleanPath = cleanPath.replace((data.matched == 1 ? episodeRegex_Rigid : (data.matched == 2 ? episodeRegex_Simple : episodeRegex_Soft)), '') // Remove episode from title
    cleanPath = cleanPath
        .replace(/[-_/]+/g, ' ')
        .trim();
    // TODO: Get title from API - https://api.jikan.moe/v4/anime?q=
    // console.log(`Clean Title: '${context}'`);

    // Title should be the cleaned path, capitalized
    data.title = cleanPath
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
        .join(' ');
}

// Function to extract Season information
function getSeasonDetails(data, context, settings) {
    // Find the season
    const season = context.match(seasonRegex_Rigid);
    data.season = season ? parseInt(season) : 1;
}

// Function to parse the URL and extract title, season, and episode
function getEpisodeDetails(data, context, settings) {
    // Filter YEAR out of path for more accurate matching
    let filteredPath = context.replace(yearRegex, "");
    // Rigid episode match
    let eMatch = 1;
    let episodeMatch = filteredPath.match(episodeRegex_Rigid);
    console.log(`After episodeRegex_Rigid: '${(episodeMatch? 'matched':'not found')}'`);
    if (!episodeMatch) { // Simple episode match
        eMatch = 2;
        episodeMatch = filteredPath.match(episodeRegex_Simple);
        console.log(`After episodeRegex_Simple: '${(episodeMatch? 'matched':'not found')}'`);
        if (!episodeMatch) { // Soft episode match
            eMatch = 3;
            // Remove (YEAR) for possible mismatch
            filteredPath = filteredPath.replace(yearRegex, '');
            episodeMatch = filteredPath.match(episodeRegex_Soft);
            console.log(`After episodeRegex_Soft: '${(episodeMatch? 'matched':'not found')}'`);
            if (!episodeMatch)
                eMatch = 0;
        }
    }
    data.matched = eMatch;
    data.episode = episodeMatch ? parseInt(episodeMatch[1]) : settings.ignoreEpisodeMatch ? 1 : 0;
}
let isWindowCreated = false;
// Function to add episode to storage
function addEpisodeToStorage(domain, document, tab, settings) {
    const data = getDetails(domain, document, tab, settings);
    // const { matched, title, season, episode } = getEpisodeDetails(((settings.obtainTitleFrom == 2) ? tab.title : new URL(tab.url).pathname).trim().toLowerCase(), settings);
    if (data.episode == 0) {
        console.log(`Ignored: ${((settings.obtainTitleFrom == 2) ? tab.title : tab.url).trim().toLowerCase()}, no episode data found.`);
        return;
    }
    chrome.storage.local.get('episodes', (_data) => {
        const episodes = _data.episodes || {};

        // Check if the title already exists in storage
        if (episodes[data.title]) {
            if (data.episode == episodes[data.title].episode) {
                console.log(`Episode already watched: ${data.title}. No updates made.`);
            } else if (isEpisodeSequential(data.episode.toString(), episodes[data.title].episode.toString())) {
                // Update the episode if it is sequential
                episodes[data.title].url = tab.url; // update URL
                episodes[data.title].season = data.season; // fix season in case we changed matching parameters
                episodes[data.title].episode = data.episode;
                episodes[data.title].completed = false;
                episodes[data.title].viewedAt = Date.now();
                console.log(`Updated: ${data.title} - Season ${data.season}, Episode ${data.episode}`);
            } else {
                // Notify because the episode is tracked, but watched out of order
                console.log(`Episode watched out of order for: ${data.title}. No updates made.`);
                if (settings.notifyOnEpisodeSkip) {
                    //
                    // Generate a notification window to warn the user that they may have skipped an episode
                    //
                    const episodeUrl = encodeURIComponent(episodes[data.title].url); // encode the original URL
                    const episodeTitle = encodeURIComponent(episodes[data.title].title); // encode the original URL
                    const popupWidth = 400;
                    const popupHeight = 300;

                    if (!isWindowCreated) {
                        isWindowCreated = true;
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            const activeTabId = tabs[0].id; // Get the ID of the active tab

                            // Get the current window's dimensions
                            chrome.windows.getCurrent({ populate: false }, (currentWindow) => {
                                const windowWidth = currentWindow.width;
                                const windowHeight = currentWindow.height;
                                const windowLeft = currentWindow.left;
                                const windowTop = currentWindow.top;

                                // Calculate the position for centering the popup
                                const leftPosition = windowLeft + Math.round((windowWidth - popupWidth) / 2);
                                const topPosition = windowTop + Math.round((windowHeight - popupHeight) / 2);

                                // Create the popup window at the calculated position
                                chrome.windows.create({
                                    // embed the episode at a _GET variable
                                    url: chrome.runtime.getURL(`notification.html?title=${episodeTitle}&url=${episodeUrl}&tabId=${activeTabId}`), // Your custom notification page
                                    type: "popup",
                                    width: popupWidth,
                                    height: popupHeight,
                                    left: leftPosition,
                                    top: topPosition
                                }, function(window) {
                                    // Listen for on-close
                                    chrome.windows.onRemoved.addListener(function(windowId) {
                                        if (windowId === window.id) {
                                            isWindowCreated = false; // Reset the flag when the window is closed
                                        }
                                    });
                                });
                            });
                        });
                    }
                }
            }
        } else {
            // Add the episode if it is Episode 1
            if (data.episode === 1 || settings.ignoreEpisodeMatch) {
                episodes[data.title] = {
                    domain: domain,
                    url: tab.url,
                    title: data.title,
                    season: data.season,
                    episode: data.episode,
                    completed: data.completed,
                    viewedAt: Date.now() // Track the time it was viewed
                };
                console.log(`Tracked: ${data.title} - Season ${data.season}, Episode ${data.episode}`);
            } else {
                console.log(`Only Episode 1 can be added for new titles. Episode ${data.episode} not tracked.`);
            }
        }

        // Save the updated episodes list back to storage
        chrome.storage.local.set({ episodes });
        console.log('Episodes saved:', episodes);
    });
}

// Add episode to tracking (forced)
function trackEpisode(domain, document, tab, settings) {
    const data = getDetails(domain, document, tab, settings);
    //const { matched, title, season, episode } = getEpisodeDetails(((settings.obtainTitleFrom == 2) ? tab.title : tab.url).trim().toLowerCase(), settings);

    chrome.storage.local.get('episodes', (_data) => {
        const episodes = _data.episodes || {};

        var isnew = (episodes[data.title]) ? false : true;

        episodes[data.title] = {
            domain: domain,
            url: tab.url,
            title: data.title,
            season: data.season,
            episode: data.episode,
            completed: data.completed,
            viewedAt: Date.now() // Track the time it was viewed
        };
        // Save the updated list of episodes
        chrome.storage.local.set({ episodes }, () => {
            if (isnew) {
                console.log(`Force Added: ${data.title} - Season ${data.season}, Episode ${data.episode}`);
            } else {
                console.log(`Force Updated: ${data.title} - Season ${data.season}, Episode ${data.episode}`);
            }
            console.log('Episodes after adding:', episodes);
        });
    });
}
// Add domain to the list of tracked domains
function trackDomain(domain) {
    chrome.storage.local.get('trackedDomains', (data) => {
        const trackedDomains = data.trackedDomains || [];
        if (!(domain in trackedDomains)) {
            trackedDomains[domain] = {
                obtainTitleFrom: 0, // Default setting for 'Obtain Title From'
                titleHtmlQueryMatch: "", // Default setting for MatchByContent
                obtainSeasonFrom: 0, // Default setting for 'Obtain Title From'
                seasonHtmlQueryMatch: "", // Default setting for MatchByContent
                obtainEpisodeFrom: 0, // Default setting for 'Obtain Title From'
                episodeHtmlQueryMatch: "", // Default setting for MatchByContent
                ignoreEpisodeMatch: false, // Default setting for 'Ignore Episode Match'
                notifyOnEpisodeSkip: true, // Default setting for 'Notify on Episode Skip'
                sortBy: 0 // Default setting for 'Sort By'
            };
            chrome.storage.local.set({ trackedDomains }, () => {
                console.log(`Domain ${domain} is now being tracked.`);
            });
        }
    });
}

// options.js
const fromOptions = ["URL", "Tab Text", "Content on Page"];
const sortBy = ["Last Viewed", "Ascending", "Descending"];

// Version Updater to fix bugs when changes are made
function VersionUpdate() {
    chrome.storage.local.get('trackedDomains', (data) => {
        const trackedDomains = data.trackedDomains || [];
        let save = false;

        // Check if data is a normal Array
        if (Array.isArray(trackedDomains)) {
            console.log("TrackedDomains is outdated. Converting to an object.");

            // Convert array to an object with default settings
            let newTrackedDomains = {};
            trackedDomains.forEach(domain => {
                newTrackedDomains[domain] = {
                    obtainTitleFrom: 0, // Default setting for 'Obtain Title From'
                    titleHtmlQueryMatch: "", // Default setting for MatchByContent
                    obtainSeasonFrom: 0, // Default setting for 'Obtain Title From'
                    seasonHtmlQueryMatch: "", // Default setting for MatchByContent
                    obtainEpisodeFrom: 0, // Default setting for 'Obtain Title From'
                    episodeHtmlQueryMatch: "", // Default setting for MatchByContent
                    ignoreEpisodeMatch: false, // Default setting for 'Ignore Episode Match'
                    notifyOnEpisodeSkip: true, // Default setting for 'Notify on Episode Skip'
                    sortBy: 0 // Default setting for 'Sort By'
                };
            });
            save = true;
        }

        Object.keys(trackedDomains).forEach(domain => {
            console.log(`Inspecting ${domain}`);
            if (!('obtainTitleFrom' in trackedDomains[domain])) {
                trackedDomains[domain]['obtainTitleFrom'] = 0; // Default to URL if not found
                save = true;
                console.log(`Updated obtainTitleFrom to (int)${fromOptions[trackedDomains[domain].obtainTitleFrom]}`);
            } else if (typeof(trackedDomains[domain].obtainTitleFrom) != "number") {
                console.log(`Typeof obtainTitleFrom (${typeof(trackedDomains[domain].obtainTitleFrom)})`);
                try {
                    trackedDomains[domain].obtainTitleFrom = fromOptions.findIndex(trackedDomains[domain].obtainTitleFrom);
                } catch (err) {
                    trackedDomains[domain].obtainTitleFrom = 0; // Default to URL if not found
                }
                save = true;
                console.log(`Updated obtainTitleFrom to (int)${fromOptions[trackedDomains[domain].obtainTitleFrom]}`);
            }
            if (!('obtainSeasonFrom' in trackedDomains[domain])) {
                trackedDomains[domain]['obtainSeasonFrom'] = 0; // Default to URL if not found
                save = true;
                console.log(`Updated obtainSeasonFrom to (int)${fromOptions[trackedDomains[domain].obtainSeasonFrom]}`);
            } else if (typeof(trackedDomains[domain].obtainSeasonFrom) != "number") {
                console.log(`Typeof obtainSeasonFrom (${typeof(trackedDomains[domain].obtainSeasonFrom)})`);
                try {
                    trackedDomains[domain].obtainSeasonFrom = fromOptions.findIndex(trackedDomains[domain].obtainSeasonFrom);
                } catch (err) {
                    trackedDomains[domain].obtainSeasonFrom = 0; // Default to URL if not found
                }
                save = true;
                console.log(`Updated obtainSeasonFrom to (int)${fromOptions[trackedDomains[domain].obtainSeasonFrom]}`);
            }
            if (!('obtainEpisodeFrom' in trackedDomains[domain])) {
                trackedDomains[domain]['obtainEpisodeFrom'] = 0; // Default to URL if not found
                save = true;
                console.log(`Updated obtainEpisodeFrom to (int)${fromOptions[trackedDomains[domain].obtainEpisodeFrom]}`);
            } else if (typeof(trackedDomains[domain].obtainEpisodeFrom) != "number") {
                console.log(`Typeof obtainEpisodeFrom (${typeof(trackedDomains[domain].obtainEpisodeFrom)})`);
                try {
                    trackedDomains[domain].obtainEpisodeFrom = fromOptions.findIndex(trackedDomains[domain].obtainEpisodeFrom);
                } catch (err) {
                    trackedDomains[domain].obtainEpisodeFrom = 0; // Default to URL if not found
                }
                save = true;
                console.log(`Updated obtainEpisodeFrom to (int)${fromOptions[trackedDomains[domain].obtainEpisodeFrom]}`);
            }
            if (!('sortBy' in trackedDomains[domain])) {
                trackedDomains[domain]['sortBy'] = 0; // Default to URL if not found
                console.log(`Updated sortBy to (int)${sortBy[trackedDomains[domain].sortBy]}`);
            } else if (typeof(trackedDomains[domain].sortBy) != "number") {
                console.log(`Typeof sortBy (${typeof(trackedDomains[domain].sortBy)})`);
                try {
                    trackedDomains[domain].sortBy = sortBy.findIndex(trackedDomains[domain].sortBy);
                } catch (err) {
                    trackedDomains[domain].sortBy = 0; // Default to Last Viewed if not found
                }
                save = true;
                console.log(`Updated sortBy to (int)${sortBy[trackedDomains[domain].sortBy]}`);
            }
        });

        if (save) {
            // Implement actual saving logic here using chrome.storage if needed
            chrome.storage.local.set({ trackedDomains }, () => {
                console.log('Saved domain settings:', trackedDomains);
            });
        }

    });

    chrome.storage.local.get('episodes', (data) => {
        const episodes = data.episodes || {};
        let save = false;

        Object.keys(episodes).forEach(title => {
            if (!('completed' in episodes[title])) {
                save = true;
                episodes[title]['completed'] = false;
                console.log(`Moved ${title} to not-completed`);
            }
        });

        if (save) {
            // Implement actual saving logic here using chrome.storage if needed
            chrome.storage.local.set({ episodes }, () => {
                console.log('Saved episodes:', episodes);
            });
        }
    });
}