// Import js in background.js
importScripts('/scripts/utils.js');
importScripts('/scripts/api/APIManager.js');
// Initialize APIManager as a global
const apiManager = new APIManager(this);

log('warn', 'Background.js Loaded');
/* Domain Struct
    "anitaku.pe":{"i":001,"c":0,"ot":0,"otm":"","os":0,"osm":"","oe":0,"oem":"","ie":0,"n":1,"s":0}
    string d        -- Domain
        int i       -- Unique ID
        int c       -- Category [ Anime, Manga, Other ]
        int ot      -- Obtain Title From ["URL", "Tab Text", "Content on Page"]
        string otm  -- String to Match Title by Content
        int os      -- Obtain Season From ["URL", "Tab Text", "Content on Page"]
        string osm  -- String to Match Season by Content
        int oe      -- Obtain Episode From ["URL", "Tab Text", "Content on Page"]
        string oem  -- String to Match Episode by Content
        int ie      -- Ignore Episode
        int n       -- Notify on Episode Skip
        int s       -- Sort By ["Last Viewed", "Ascending", "Descending"]
 */
/* Cloud Struct
    49458:{"c":0,"d":001,"e":11,"l":"kono-subarashii-sekai-ni-shukufuku-wo-3-episode-11"}
    int i -- Unique ID
        int c       -- Category [ Anime, Manga, Other ]
        int d       -- Last active domain ID
        int e       -- Active Episode
        string l    -- Link to URL last viewed (without domain)
*/
/* Local Struct
    49458:{"c":0,"d":001,"f":0,"t":"Kono Subarashii Sekai Ni Shukufuku Wo 3","e":11,"n":11,"p":"https:\/\/cdn.myanimelist.net\/images\/anime\/1758\/141268t.jpg","l":"kono-subarashii-sekai-ni-shukufuku-wo-3-episode-11","u":1.729074538804e+12}}
    int i -- Unique ID
        int c       -- Category [ Anime, Manga, Other ]
        int d       -- Last active domain ID
        int f       -- Finished watching
        string t    -- *Title
        int e       -- Active Episode
        int r       -- *Released episodes
        int n       -- *Max contracted episodes
        string p    -- *Thumbnail URL
        string l    -- Link to URL last viewed (without domain)
        string u    -- last updated
*/
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === "update") {
        const currentVersion = chrome.runtime.getManifest().version;
        // Purge all save-data
        // chrome.storage.local.clear(() => {
        //     if (chrome.runtime.lastError) {
        //         log('error',"Error clearing chrome.storage.local:", chrome.runtime.lastError);
        //     } else {
        //         log('log',"All data cleared from chrome.storage.local.");
        //     }
        // });
        // chrome.storage.sync.clear(() => {
        //     if (chrome.runtime.lastError) {
        //         log('error',"Error clearing chrome.storage.sync:", chrome.runtime.lastError);
        //     } else {
        //         log('log',"All data cleared from chrome.storage.sync.");
        //     }
        // });
        chrome.contextMenus.create({
            id: "editDomains",
            title: "Domain Settings", // Your desired name
            contexts: ["action"]
        });
        chrome.contextMenus.create({
            id: "editEpisodes",
            title: "Episode Settings", // Your desired name
            contexts: ["action"]
        });
        VersionUpdate();
    }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    switch (info.menuItemId) {
        case "editDomains":
            chrome.tabs.create({ url: chrome.runtime.getURL("domain_settings.html") });
            break;
        case "editEpisodes":
            chrome.tabs.create({ url: chrome.runtime.getURL("episode_settings.html") });
            break;
    }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "customOptions") {
        chrome.runtime.openOptionsPage(); // Opens the options page
    }
});

// Handle messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    log('warn', 'Background.js onMessage Listener Loaded');
    if (request.action === 'trackDomain') {
        // sendResponse({ status: "success" });
        trackDomain(request.domain, request.category);
        sendResponse({ success: true });
        return true;
    }
    if (request.action === 'trackEpisode') {
        // sendResponse({ status: "success" });
        log('log', `Domain Tracking Requested: ${request.domain}`);

        getDomains().then((Domains) => {
            //const domain = getDomainFromUrl(request.domain);
            if (Domains.hasOwnProperty(request.domain)) {
                const settings = Domains[request.domain];
                settings['forced'] = true;
                addEpisode(request.domain, settings, { id: request.id, url: request.url, title: request.title });
            }
        });
        sendResponse({ success: true });
        return true;
    }
    // switch (request.action) {
    //     case 'trackDomain':
    //         {
    //         }
    //         return true;
    //     case 'trackEpisode':
    //         {
    //         }
    //         return true;
    //     case 'addEpisode':
    //         {
    //             // })();
    //         }
    //         return true;
    //     default:
    //         {
    //             log('log', `Unhandled Request: ${request.action}`);
    //         }
    // }
    return false;
});
// chrome.runtime.onConnect.addListener((port) => {
//     log('log', 'Port connected: ', port.name);
//     port.onMessage.addListener(async(request) => {
//         if (request.action === 'addEpisode') {
//             // (async() => {
//             try {
//                 // log('log', `Processing addEpisode Request`);
//                 // sendResponse({ status: "success" });
//                 // const _settings = request.settings;
//                 // Force the update of all API details
//                 // _settings['cloud'] = true;
//                 // await addEpisodeToStorage(request.api_data, request.tab, _settings);
//                 // .then((r) => {
//                 // sendResponse({ success: true });
//                 port.postMessage({ success: true });
//                 // });
//             } catch (err) {
//                 console.error("Error processing addEpisode:", err);
//                 port.postMessage({ success: false, error: err.message });
//             }
//             return true;
//         }
//     });
//     port.onDisconnect.addListener(() => {
//         console.log("Port disconnected:", port.name);
//     });
// });

// Listener for tab updates (i.e., when a user navigates to a new page)
chrome.tabs.onUpdated.addListener(async(tabId, changeInfo, tab) => {
    // log('log',`Domain Page ${changeInfo.status}: ${tab.url}`);
    if (changeInfo.status === 'complete' && tab.url) {
        const domain = getDomainFromUrl(tab.url);
        log('log', `Domain Page Loaded: ${domain}`);
        // let Domains = await asyncutils.getDomains();
        getDomains().then((Domains) => {
            // Check if this domain is tracked
            if (Domains.hasOwnProperty(domain)) {
                // Check Permissions
                hasPermission(URL_PATTERN.replace('$d', domain)).then((result) => {
                    // We still have permissions
                    const settings = Domains[domain];
                    addEpisode(domain, settings, tab);
                }).catch((error) => {
                    // We don't have permissions
                    if (settings.ot == 2 || settings.os == 2 || settings.oe == 2) {
                        // Request necessary permissions
                        chrome.permissions.request({
                            origins: [URL_PATTERN.replace('$d', domain)]
                        }, (granted) => {
                            // The callback argument will be true if the user granted the permissions.
                            if (granted) {
                                const settings = Domains[domain];
                                addEpisode(domain, settings, tab);
                            } else {
                                log('log', `Domain Permissions Refused for ${domain}`);
                            }
                        });
                    } else {
                        // Don't actually need the permissions for this domain
                        const settings = Domains[domain];
                        addEpisode(domain, settings, tab);
                    }
                });
            }
        });
    }
});

async function addEpisode(domain, settings, tab) {
    if (settings.ot == 2 || settings.os == 2 || settings.oe == 2) {
        // Wait for dynamic changes to finish (Crunchyroll)
        await delayExecution(3000);
        const domain = getDomainFromUrl(tab.url);
        const alreadyhasPermission = await hasPermission(URL_PATTERN.replace('$d', domain));
        if (!alreadyhasPermission) {
            log('error', 'Permission to getDocumentContent denied by user.');
            return;
        }
        // Get current content
        chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: getDocumentContent, // The function to be executed in the content script
            args: [settings]
        }, (results) => {
            if (chrome.runtime.lasterror) {
                log('error', 'Script Injection Error: ', chrome.runtime.lastError.message);
            } else {
                log('log', 'Script Injection Complete.');
            }
            if (results) {
                if (results[0]) {
                    const documentContent = results[0].result;
                    if (!documentContent) {
                        console.log(`Page Content not found. Results:`, results);
                        // log('log', `Page Content not found. Results:`, results[0]);
                    }
                    log('log', 'Current Document content retrieved. ', documentContent);

                    const details = getDetails(domain, documentContent, tab, settings);
                    if (!details) {
                        log('log', `Details not found. Skipping.`);
                        return;
                    }
                    if (details.episode == 0 && settings.ie == 0) {
                        log('log', `Episode not found. Skipping ${details.title}`);
                        return;
                    }
                    const data = getFromAPI(details, tab, settings);
                }
            }
        });

    } else {
        // If we don't need content from the page, just add it with what we have
        const details = getDetails(domain, { title: 'ignored', season: 'ignored', episode: 'ignored' }, tab, settings);
        if (!details) {
            log('log', `Details not found. Skipping.`);
            return;
        }
        if (details.episode == 0 && settings.ie == 0) {
            log('log', `Episode not found. Skipping ${details.title}`);
            return;
        }
        const data = getFromAPI(details, tab, settings);
    }
}
async function getFromAPI(details, tab, settings) {
    try {
        // Send API Request, and await message 'addEpisode'
        apiManager.request(categories[settings.c], details, tab, settings);
        // apiManager.request(categories[settings.c], details, tab, settings).then((data) => {
        //     if (!data) {
        //         log('error', `API.request returned null.`);
        //         return;
        //     }
        //     addEpisodeToStorage(data, tab, settings);
        // });
        // const data = await apiCall.fetch(details, tab, settings);
    } catch (error) {
        log('error', `Unable to fetch from API. <${error.type}> ${error.message}\n${error.stack}`);
        return;
    }
    // TODO: Cache requests to avoid unnecessary API calls when reading quickly
    // switch (categories[settings.c]) {
    //     case "Anime":
    //         {
    //             // Get title from API - https://api.jikan.moe/v4/anime?q=
    //             fetchJikanAnime(details)
    //             .then(retA => {
    //                 if (!retA.json.data[0]) {
    //                     log('error', `JIKAN Data[0] not Found searching ${tab.url}`);
    //                     return;
    //                 }
    //                 fetchJikanAnimeEpisodes(retA.json.data[0].mal_id)
    //                     .then(retEp => {
    //                         log('log', `JIKAN Found ${retEp.json.data.length} episodes for ${retA.json.data[0].mal_id}`);
    //                         const jikan = {
    //                             id: retA.json.data[0].mal_id,
    //                             c: settings.c, // Anime
    //                             d: settings.i,
    //                             f: 0,
    //                             t: details.title,
    //                             e: details.episode,
    //                             r: retEp.json.data.length,
    //                             n: retA.json.data[0].episodes,
    //                             p: retA.json.data[0].images.jpg.small_image_url,
    //                             l: "tab.url", // URL Last Viewed
    //                             u: Date.now() // Track the time it was viewed
    //                         };
    //                         // Try to get Title from Jikan.
    //                         // NOTE: It can be in an array called "Titles", or as a collection of objects called "title(_language?)"
    //                         const titles = retA.json.data[0].titles;
    //                         if (titles) {
    //                             // Check array of titles for english title
    //                             let title = titles[0].title;
    //                             jikan.t = title; // Default to first-found (usually Default)
    //                             titles.forEach(t => {
    //                                 if (t.type == "English") // Found english
    //                                     jikan.t = t.title;
    //                                 // title = t.title;
    //                             });
    //                             log('log', `JIKAN Success: ${jikan.id} / ${jikan.t}`);
    //                         } else {
    //                             if (retA.json.data[0].title) // default
    //                                 jikan.t = retA.json.data[0].title;
    //                             if (retA.json.data[0].title_english) // english
    //                                 jikan.t = retA.json.data[0].title_english;
    //                         }
    //                         // replace title
    //                         // ret.data.title = title;
    //                         addEpisodeToStorage(jikan, tab, settings);
    //                     });
    //             })
    //             .catch(error => log('error', `JIKAN Error: ${error}`));
    //             break;
    //         }
    //     case "Manga":
    //         {
    //             // Get title from API - https://api.jikan.moe/v4/manga?q=
    //             fetchJikanManga(details)
    //             .then(ret => {
    //                 if (!ret.json.data[0]) {
    //                     log('error', `JIKAN Data[0] not Found searching ${tab.url}`);
    //                     return;
    //                 }
    //                 const jikan = {
    //                     id: ret.json.data[0].mal_id,
    //                     c: settings.c, // Manga
    //                     d: settings.i,
    //                     f: 0,
    //                     t: details.title,
    //                     e: details.episode,
    //                     r: details.episode,
    //                     n: ret.json.data[0].chapters, // Jikan uses chapters for anime, not episodes
    //                     p: ret.json.data[0].images.jpg.small_image_url,
    //                     l: "tab.url", // URL Last Viewed
    //                     u: Date.now() // Track the time it was viewed
    //                 };
    //                 // Try to get Title from Jikan.
    //                 // NOTE: It can be in an array called "Titles", or as a collection of objects called "title(_language?)"
    //                 const titles = ret.json.data[0].titles;
    //                 if (titles) {
    //                     // Check array of titles for english title
    //                     let title = titles[0].title;
    //                     jikan.t = title; // Default to first-found (usually Default)
    //                     titles.forEach(t => {
    //                         if (t.type == "English") // Found english
    //                             jikan.t = t.title;
    //                         // title = t.title;
    //                     });
    //                     log('log', `JIKAN Success: ${jikan.id} / ${jikan.t}`);
    //                 } else {
    //                     if (ret.json.data[0].title) // default
    //                         jikan.t = ret.json.data[0].title;
    //                     if (ret.json.data[0].title_english) // english
    //                         jikan.t = ret.json.data[0].title_english;
    //                 }
    //                 // replace title
    //                 // ret.data.title = title;
    //                 addEpisodeToStorage(jikan, tab, settings);
    //             })
    //             .catch(error => log('error', `JIKAN Error: ${error}`));
    //             break;
    //         }
    //     case "Movies":
    //         // Movies not supported yet. Treat as "Other"
    //     case "Other":
    //         // Default is "Other"
    //     default:
    //         {
    //             // TODO: Get title from existing match
    //             const ep = {
    //                 id: details.title,
    //                 c: settings.c, // Other
    //                 d: settings.i,
    //                 f: 0,
    //                 t: details.title,
    //                 e: details.episode,
    //                 r: details.episode,
    //                 n: details.episode,
    //                 p: "", // Empty thumbnail removes it from the Episode Card
    //                 l: "tab.url", // URL Last Viewed
    //                 u: Date.now() // Track the time it was viewed
    //             };
    //             log('log', `Raw Success: ${ep.id} / ${ep.t}`);
    //             addEpisodeToStorage(ep, tab, settings);
    //             break;
    //         }
    // }
}
// The function that will run in the context of the content script
function getDocumentContent(settings) {
    const data = {
        title: 'ignored',
        season: 'ignored',
        episode: 'ignored',
        errorType: null,
        errorMessage: null,
        errorStack: null
    };


    // log('log', 'Querying for content.');
    try {
        // Example: Get the inner HTML of the body (you can modify this as needed)
        if (settings.ot) {
            try {
                data.title = document.querySelector(settings.otm).innerText;
            } catch (err) {
                if (err.name == "SyntaxError") {
                    const match = document.body.innerHTML.match(new RegExp(settings.otm, 'i'));
                    if (match)
                        data.title = match[0];
                    else
                        data.title = "Match Not Found";
                } else {
                    data.errorType = err.name;
                    data.errorMessage = err.message;
                    // data.errorStack = err.stack;
                }
            }
            if (!data.title)
                data.title = "Match was Empty";
        }
        // Example: Get the inner HTML of the body (you can modify this as needed)
        if (settings.os) {
            try {
                data.season = document.querySelector(settings.osm).innerText;
            } catch (err) {
                if (err.name == "SyntaxError") {
                    const match = document.body.innerHTML.match(new RegExp(settings.osm, 'i'));
                    if (match)
                        data.season = match[0];
                    else
                        data.season = "Match Not Found";
                } else {
                    data.errorType = err.name;
                    data.errorMessage = err.message;
                    // data.errorStack = err.stack;
                }
            }
            if (!data.season)
                data.season = "Match was Empty";
        }
        // Example: Get the inner HTML of the body (you can modify this as needed)
        if (settings.oe) {
            try {
                data.episode = document.querySelector(settings.oem).innerText;
            } catch (err) {
                //if (err instanceof SyntaxError)
                if (err.name == "SyntaxError") {
                    const match = document.body.innerHTML.match(new RegExp(settings.oem, 'i'));
                    if (match)
                        data.episode = match[0];
                    else
                        data.episode = "Match Not Found";
                } else {
                    data.errorType = err.name;
                    data.errorMessage = err.message;
                    // data.errorStack = err.stack;
                }
            }
            if (!data.episode)
                data.episode = "Match was Empty";
        }
    } catch (error) {
        // log('error', 'Unable to query document.');
        data.errorType = err.name;
        data.errorMessage = err.message;
        // data.errorStack = err.stack;
    }
    // log('log', `getDocumentContent returns {${data.title}, ${data.season}, ${data.episode}}`);
    return data;
}

// Function to display a warning notifications in Windows
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
            log('error', 'Notification creation failed:', chrome.runtime.lastError.message);
        } else {
            log('log', 'Notification created with ID:', notificationId);
        }
    });
}

function getDetails(domain, documentContent, tab, settings) {
    let data = {
        matched: false,
        season: null,
        episode: null,
        completed: false,
        title: null
    }
    switch (parseInt(settings.os)) {
        case 0:
            // log('log', `Searching Season using: '${new URL(tab.url).pathname}'`);
            getSeasonDetails(data, new URL(tab.url).pathname, settings);
            break;
        case 1:
            // log('log', `Searching Season from Title`);
            getSeasonDetails(data, tab.title.trim(), settings);
            break;
        case 2:
            if (documentContent && documentContent.hasOwnProperty('season')) {
                // log('log', `Searching Season from Selector`);
                getSeasonDetails(data, documentContent.season.trim(), settings);
            } else {
                log('warn', `Could not find season data.`);
                data.season = 1;
            }
            break;
        default:
            log('log', `ERROR: obtainSeasonFrom = '${settings.os}'`);
            settings['os'] = 0;
            log('log', `Searching Season using: '${new URL(tab.url).pathname}'`);
            getSeasonDetails(data, new URL(tab.url).pathname, settings);
    }
    log('log', `Season Match: '${data.season}'`);
    switch (parseInt(settings.oe)) {
        case 0:
            log('log', `Searching Episode using: '${new URL(tab.url).pathname}'`);
            getEpisodeDetails(data, new URL(tab.url).pathname, settings);
            break;
        case 1:
            log('log', `Searching Episode using: '${tab.episode.trim()}'`);
            getEpisodeDetails(data, tab.episode.trim(), settings);
            break;
        case 2:
            if (documentContent && documentContent.hasOwnProperty('episode')) {
                log('log', `Searching Episode using: '${documentContent.episode.trim()}'`);
                getEpisodeDetails(data, documentContent.episode.trim(), settings);
            } else {
                log('warn', `Could not find episode data.`);
                if (!settings.ie)
                    return null;
                data.episode = 0;
            }
            break;
        default:
            log('log', `ERROR: obtainEpisodeFrom = '${settings.oe}'`);
            settings['oe'] = 0;
            log('log', `Searching Episode using: '${new URL(tab.url).pathname}'`);
            getEpisodeDetails(data, new URL(tab.url).pathname, settings);
    }
    log('log', `Episode Match: '${data.episode}'`);
    switch (parseInt(settings.ot)) {
        case 0:
            log('log', `Searching Title using: '${new URL(tab.url).pathname}'`);
            getTitleDetails(data, new URL(tab.url).pathname, settings);
            break;
        case 1:
            log('log', `Searching Title from Title`);
            getTitleDetails(data, tab.title.trim(), settings);
            break;
        case 2:
            if (documentContent) {
                if (documentContent.hasOwnProperty('title')) {
                    log('log', `Searching Title from Selector`);
                    getTitleDetails(data, documentContent.title.trim(), settings);
                } else {
                    log('warn', `Could not find title data.`);
                    return null;
                }
            } else {
                log('warn', `Could not find page data.`);
                return null;
            }
            break;
        default:
            log('warn', `ERROR: obtainTitleFrom = '${settings.ot}'`);
            settings['ot'] = 0;
            log('log', `Searching Title from URL`);
            getTitleDetails(data, new URL(tab.url).pathname, settings);
    }
    log('log', `Title Match: '${data.title}'`);
    return data;
}

// Function to extract a unique Title
// NOTE: Soft match can match YEAR or SEASON in the title
function getTitleDetails(data, context, settings) {
    // log('log',`Title Search: '${context}'`);
    let cleanPath = context;
    if (settings.ot == settings.oe)
        cleanPath = cleanPath.replace((data.matched == 1 ? episodeRegex_Rigid : (data.matched == 2 ? episodeRegex_Simple : episodeRegex_Soft)), '') // Remove episode from title
    cleanPath = cleanPath
        .replace(/[-_/]+/g, ' ')
        .trim();
    // log('log',`Clean Title: '${context}'`);

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
    log('log', `After episodeRegex_Rigid: '${(episodeMatch? 'matched':'not found')}'`);
    if (!episodeMatch) { // Simple episode match
        eMatch = 2;
        episodeMatch = filteredPath.match(episodeRegex_Simple);
        log('log', `After episodeRegex_Simple: '${(episodeMatch? 'matched':'not found')}'`);
        if (!episodeMatch) { // Soft episode match
            eMatch = 3;
            // Remove (YEAR) for possible mismatch
            filteredPath = filteredPath.replace(yearRegex, '');
            episodeMatch = filteredPath.match(episodeRegex_Soft);
            log('log', `After episodeRegex_Soft: '${(episodeMatch? 'matched':'not found')}'`);
            if (!episodeMatch)
                eMatch = 0;
        }
    }
    data.matched = eMatch;
    data.episode = episodeMatch ? episodeMatch[1] : settings.ie ? 1 : 0;
}
let isWindowCreated = false;
// Function to add episode to storage
async function addEpisodeToStorage(api_data, tab, settings) {
    // return await new Promise((resolve, reject) => {
    // If episode didn't match, and we're not allowed to skip
    if (api_data.episode == 0 && settings.ie == 0) {
        log('log', `Ignored: ${((settings.ot == 2) ? tab.title : tab.url).trim().toLowerCase()}, no episode data found.`);
        return;
    }
    // const episodes = getEpisodes();
    const episodes = await getEpisodes();
    // .then((episodes) => {

    // chrome.storage.local.get('episodes', (_data) => {
    //     const episodes = _data.episodes || {};

    // Check if the title already exists in storage
    if (episodes[api_data.id]) {
        if (settings.cloud) {
            // Update the episode if we got data for cloudEpisodes
            // C, D, E, L shared from cloudEpisodes
            // F, U already processed
            episodes[api_data.id].t = api_data.t;
            episodes[api_data.id].r = api_data.r;
            episodes[api_data.id].n = api_data.n;
            episodes[api_data.id].p = api_data.p;
            log('log', `Cloud Episode updated: ${api_data.id}.`);
        } else if (api_data.e <= episodes[api_data.id].e) {
            episodes[api_data.id].d = settings.i; // we're changing URL, so we need to change the domain it links to as well
            episodes[api_data.id].l = new URL(tab.url).pathname; // update URL
            episodes[api_data.id].r = api_data.r;
            episodes[api_data.id].n = api_data.n;
            episodes[api_data.id].p = api_data.p;
            log('log', `Episode already watched: ${api_data.id}.`);
        } else if (isEpisodeSequential(api_data.e.toString(), episodes[api_data.id].e.toString()) || settings.forced) {
            // Update the episode if it is sequential
            episodes[api_data.id].d = settings.i; // we're changing URL, so we need to change the domain it links to as well
            episodes[api_data.id].l = new URL(tab.url).pathname; // update URL
            // episodes[data.title].season = data.season; // fix season in case we changed matching parameters
            episodes[api_data.id].e = api_data.e;
            episodes[api_data.id].r = api_data.r;
            episodes[api_data.id].n = api_data.n;
            episodes[api_data.id].f = api_data.f;
            episodes[api_data.id].p = api_data.p;
            episodes[api_data.id].u = Date.now();
            log('log', `Updated: ${api_data.id} - Episode ${api_data.e}`);
        } else {
            // Notify because the episode is tracked, but watched out of order
            log('log', `Episode watched out of order for: ${api_data.id}. No updates made.`);
            if (settings.n) {
                //
                // Generate a notification window to warn the user that they may have skipped an episode
                //
                const episodeUrl = encodeURIComponent(episodes[api_data.id].l); // encode the original URL
                const episodeTitle = encodeURIComponent(episodes[api_data.id].t); // encode the original URL
                const popupWidth = 400;
                const popupHeight = 300;
                // Patched to ignore when we're receiving data from cloudEpisodes
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
        // Add the episode if it is Episode 1, or we're ignoring episode match, or we're forcably adding the episode
        if (parseInt(api_data.e) === 1 || settings.ie || settings.forced) {
            //const domainID = Domains[domain].i;
            episodes[api_data.id] = {
                c: settings.c, // Match Domain Filter
                d: settings.i,
                f: api_data.f,
                t: api_data.t,
                e: api_data.e,
                r: api_data.r,
                n: api_data.n,
                p: api_data.p,
                l: new URL(tab.url).pathname, // URL Last Viewed
                u: Date.now() // Track the time it was viewed
            };
            log('log', `Tracked: ${api_data.t} - Episode ${api_data.e} of ${api_data.n}`);
        } else {
            // TODO: Handle force-track-episode
            log('log', `Only Episode 1 can be added for new titles. Episode ${api_data.e} not tracked.`);
        }
    }

    // Save the updated episodes list back to storage
    // chrome.storage.local.set({ episodes });
    // log('log','Episodes saved:', episodes);
    const r = await saveEpisodes(episodes);
    // .then((r) => {
    chrome.runtime.sendMessage({ action: "reload" }, (response) => {
        if (chrome.runtime.lastError)
        ; // Ignore Error when user stops focusing

    });
    // });

    // });
    // });
    // });
}

// Create an ID 1 incremented from the highest ID in Domains
// TODO: Check all episodes for existing ID's, or save a variable for the new unique id
function createDomainId(Domains) {
    let max = 0;
    for (let domain in Domains) {
        if (Domains[domain].i > max)
            max = Domains[domain].i;
    }
    // Object.keys(Domains).forEach(domain => {
    //     if (domain.i > max)
    //         max = domain.i;
    // });
    return max + 1;
}
/*
string d        -- Domain
    int i       -- Unique ID
    int c       -- Category [ Anime, Manga, Other ]
    int ot      -- Obtain Title From ["URL", "Tab Text", "Content on Page"]
    string otm  -- String to Match Title by Content
    int os      -- Obtain Season From ["URL", "Tab Text", "Content on Page"]
    string osm  -- String to Match Season by Content
    int oe      -- Obtain Episode From ["URL", "Tab Text", "Content on Page"]
    string oem  -- String to Match Episode by Content
    int ie      -- Ignore Episode
    int n       -- Notify on Episode Skip
    int s       -- Sort By ["Last Viewed", "Ascending", "Descending"]
    */
// Add domain to the list of tracked domains
async function trackDomain(domain, category) {
    // const Domains = getDomains();
    getDomains()
        .catch((error) => {
            log('error', `Failed to get Domains: ${error.name}: ${error.message}`);
        })
        .then((Domains) => {
            // log('log','Domains after Loading:', Domains);
            // if (!(domain in Domains)) {
            if (!Domains.hasOwnProperty(domain)) {
                const uid = createDomainId(Domains);

                Domains[domain] = {
                    i: uid,
                    c: category, // Set Category
                    ot: 0, // 'Obtain Title From' URL
                    otm: "", // Empty Title Match String
                    os: 0, // 'Obtain Season From' URL
                    osm: "", // Empty Season Match String
                    oe: 0, // 'Obtain Episode From' URL
                    oem: "", // Empty Episode Match String
                    ie: false, // 'Ignore Episode Match'
                    n: true, // 'Notify on Episode Skip'
                    s: 0 // 'Sort By' Last Updated
                };
                saveDomains(Domains);
                log('log', `Domain ${domain} is now being tracked.`);
                chrome.runtime.sendMessage({ action: "reload" }, (response) => {
                    if (chrome.runtime.lastError)
                    ; // Ignore Error when user stops focusing

                });
            }
        });
}