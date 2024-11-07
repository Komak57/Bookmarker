// Import utils.js in background.js
importScripts('utils.js');
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
        //         console.error("Error clearing chrome.storage.local:", chrome.runtime.lastError);
        //     } else {
        //         console.log("All data cleared from chrome.storage.local.");
        //     }
        // });
        // chrome.storage.sync.clear(() => {
        //     if (chrome.runtime.lastError) {
        //         console.error("Error clearing chrome.storage.sync:", chrome.runtime.lastError);
        //     } else {
        //         console.log("All data cleared from chrome.storage.sync.");
        //     }
        // });
        VersionUpdate();
    }
});

// Handle messages from popup.js
chrome.runtime.onMessage.addListener(async(request, sender, sendResponse) => {
    if (request.action === 'trackDomain') {
        trackDomain(request.domain);
        sendResponse({ status: "success" });
    } else if (request.action === 'trackEpisode') {
        console.log(`Domain Tracking Requested: ${request.domain}`);

        getDomains().then((Domains) => {
            //const domain = getDomainFromUrl(request.domain);
            if (Domains.hasOwnProperty(request.domain)) {
                const settings = Domains[request.domain];
                settings['forced'] = true;
                addEpisode(request.domain, settings, { id: request.id, url: request.url, title: request.title });
            }
        });
    }
});

// Listener for tab updates (i.e., when a user navigates to a new page)
chrome.tabs.onUpdated.addListener(async(tabId, changeInfo, tab) => {
    // console.log(`Domain Page ${changeInfo.status}: ${tab.url}`);
    if (changeInfo.status === 'complete' && tab.url) {

        const domain = getDomainFromUrl(tab.url);
        console.log(`Domain Page Loaded: ${domain}`);
        // let Domains = await asyncGetDomains();
        getDomains().then((Domains) => {
            // Check if this domain is tracked
            if (Domains.hasOwnProperty(domain)) {
                const settings = Domains[domain];
                addEpisode(domain, settings, tab);
            }
        });
    }
});

async function addEpisode(domain, settings, tab) {
    if (settings.ot == 2 || settings.os == 2 || settings.oe == 2) {
        // Wait for dynamic changes to finish (Crunchyroll)
        await delayExecution(3000);
        // Get current content
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
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

                    const details = getDetails(domain, documentContent, tab, settings);

                    if (details.episode == 0 && settings.ie == 0) {
                        console.log(`Episode not found. ${details.title} skipped.`);
                        return;
                    }
                    const data = getFromAPI(details, tab, settings);
                }
            }
        });

    } else {
        // If we don't need content from the page, just add it with what we have
        const details = getDetails(domain, { title: 'ignored', season: 'ignored', episode: 'ignored' }, tab, settings);

        if (details.episode == 0 && settings.ie == 0) {
            console.log(`Episode not found. ${details.title} skipped.`);
            return;
        }
        const data = getFromAPI(details, tab, settings);
    }
}

function getFromAPI(details, tab, settings) {
    // TODO: Cache requests to avoid unnecessary API calls when reading quickly
    switch (categories[settings.c]) {
        case "Anime":
            {
                // Get title from API - https://api.jikan.moe/v4/anime?q=
                fetchJikanAnime(details)
                .then(retA => {
                    if (!retA.json.data[0]) {
                        console.error(`JIKAN Data[0] not Found searching ${tab.url}`);
                        return;
                    }
                    fetchJikanAnimeEpisodes(retA.json.data[0].mal_id)
                        .then(retEp => {
                            console.log(`JIKAN Found ${retEp.json.data.length} episodes for ${retA.json.data[0].mal_id}`);
                            const jikan = {
                                id: retA.json.data[0].mal_id,
                                c: settings.c, // Anime
                                d: settings.i,
                                f: 0,
                                t: details.title,
                                e: details.episode,
                                r: retEp.json.data.length,
                                n: retA.json.data[0].episodes,
                                p: retA.json.data[0].images.jpg.small_image_url,
                                l: "tab.url", // URL Last Viewed
                                u: Date.now() // Track the time it was viewed
                            };
                            // Try to get Title from Jikan.
                            // NOTE: It can be in an array called "Titles", or as a collection of objects called "title(_language?)"
                            const titles = retA.json.data[0].titles;
                            if (titles) {
                                // Check array of titles for english title
                                let title = titles[0].title;
                                jikan.t = title; // Default to first-found (usually Default)
                                titles.forEach(t => {
                                    if (t.type == "English") // Found english
                                        jikan.t = t.title;
                                    // title = t.title;
                                });
                                console.log(`JIKAN Success: ${jikan.id} / ${jikan.t}`);
                            } else {
                                if (retA.json.data[0].title) // default
                                    jikan.t = retA.json.data[0].title;
                                if (retA.json.data[0].title_english) // english
                                    jikan.t = retA.json.data[0].title_english;
                            }
                            // replace title
                            // ret.data.title = title;
                            addEpisodeToStorage(jikan, tab, settings);
                        });
                })
                .catch(error => console.error(`JIKAN Error: ${error}`));
                break;
            }
        case "Manga":
            {
                // Get title from API - https://api.jikan.moe/v4/manga?q=
                fetchJikanManga(details)
                .then(ret => {
                    if (!ret.json.data[0]) {
                        console.error(`JIKAN Data[0] not Found searching ${tab.url}`);
                        return;
                    }
                    const jikan = {
                        id: ret.json.data[0].mal_id,
                        c: settings.c, // Manga
                        d: settings.i,
                        f: 0,
                        t: details.title,
                        e: details.episode,
                        r: details.episode,
                        n: ret.json.data[0].chapters, // Jikan uses chapters for anime, not episodes
                        p: ret.json.data[0].images.jpg.small_image_url,
                        l: "tab.url", // URL Last Viewed
                        u: Date.now() // Track the time it was viewed
                    };
                    // Try to get Title from Jikan.
                    // NOTE: It can be in an array called "Titles", or as a collection of objects called "title(_language?)"
                    const titles = ret.json.data[0].titles;
                    if (titles) {
                        // Check array of titles for english title
                        let title = titles[0].title;
                        jikan.t = title; // Default to first-found (usually Default)
                        titles.forEach(t => {
                            if (t.type == "English") // Found english
                                jikan.t = t.title;
                            // title = t.title;
                        });
                        console.log(`JIKAN Success: ${jikan.id} / ${jikan.t}`);
                    } else {
                        if (ret.json.data[0].title) // default
                            jikan.t = ret.json.data[0].title;
                        if (ret.json.data[0].title_english) // english
                            jikan.t = ret.json.data[0].title_english;
                    }
                    // replace title
                    // ret.data.title = title;
                    addEpisodeToStorage(jikan, tab, settings);
                })
                .catch(error => console.error(`JIKAN Error: ${error}`));
                break;
            }
        case "Movies":
            // Movies not supported yet. Treat as "Other"
        case "Other":
            // Default is "Other"
        default:
            {
                // TODO: Get title from existing match
                const ep = {
                    id: details.title,
                    c: settings.c, // Other
                    d: settings.i,
                    f: 0,
                    t: details.title,
                    e: details.episode,
                    r: details.episode,
                    n: details.episode,
                    p: "", // Empty thumbnail removes it from the Episode Card
                    l: "tab.url", // URL Last Viewed
                    u: Date.now() // Track the time it was viewed
                };
                console.log(`Raw Success: ${ep.id} / ${ep.t}`);
                addEpisodeToStorage(ep, tab, settings);
                break;
            }
    }
}
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
        if (settings.otm) {

            try {
                data.title = document.querySelector(settings.otm).innerText;
            } catch (err) {
                if (err.name == "SyntaxError") {
                    const match = document.body.innerHTML.match(new RegExp(settings.otm, 'i'));
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
        if (settings.osm) {
            try {
                data.season = document.querySelector(settings.osm).innerText;
            } catch (err) {
                if (err.name == "SyntaxError") {
                    const match = document.body.innerHTML.match(new RegExp(settings.osm, 'i'));
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
        if (settings.oem) {
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
            console.error('Notification creation failed:', chrome.runtime.lastError.message);
        } else {
            console.log('Notification created with ID:', notificationId);
        }
    });
}

function getDetails(domain, document, tab, settings) {
    let data = {
        matched: false,
        season: null,
        episode: null,
        completed: false,
        title: null
    }
    switch (parseInt(settings.os)) {
        case 0:
            console.log(`Searching Season using: '${new URL(tab.url).pathname}'`);
            getSeasonDetails(data, new URL(tab.url).pathname, settings);
            break;
        case 1:
            console.log(`Searching Season from Title`);
            getSeasonDetails(data, tab.title.trim(), settings);
            break;
        case 2:
            console.log(`Searching Season from Selector`);
            getSeasonDetails(data, document.season.trim(), settings);
            break;
        default:
            console.log(`ERROR: obtainSeasonFrom = '${settings.os}'`);
            settings['os'] = 0;
            console.log(`Searching Season using: '${new URL(tab.url).pathname}'`);
            getSeasonDetails(data, new URL(tab.url).pathname, settings);
    }
    console.log(`Season Match: '${data.season}'`);
    switch (parseInt(settings.oe)) {
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
            console.log(`ERROR: obtainEpisodeFrom = '${settings.oe}'`);
            settings['oe'] = 0;
            console.log(`Searching Episode using: '${new URL(tab.url).pathname}'`);
            getEpisodeDetails(data, new URL(tab.url).pathname, settings);
    }
    console.log(`Episode Match: '${data.episode}'`);
    switch (parseInt(settings.ot)) {
        case 0:
            console.log(`Searching Title using: '${new URL(tab.url).pathname}'`);
            getTitleDetails(data, new URL(tab.url).pathname, settings);
            break;
        case 1:
            console.log(`Searching Title from Title`);
            getTitleDetails(data, tab.title.trim(), settings);
            break;
        case 2:
            console.log(`Searching Title from Selector`);
            getTitleDetails(data, document.title.trim(), settings);
            break;
        default:
            console.log(`ERROR: obtainTitleFrom = '${settings.ot}'`);
            settings['ot'] = 0;
            console.log(`Searching Title from URL`);
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
    if (settings.ot == settings.oe)
        cleanPath = cleanPath.replace((data.matched == 1 ? episodeRegex_Rigid : (data.matched == 2 ? episodeRegex_Simple : episodeRegex_Soft)), '') // Remove episode from title
    cleanPath = cleanPath
        .replace(/[-_/]+/g, ' ')
        .trim();
    // console.log(`Clean Title: '${context}'`);

    // Title should be the cleaned path, capitalized
    data.title = cleanPath
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
        .join(' ');
}

async function fetchJikanAnime(details) {
    const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(details.title)}&limit=1`;
    console.log(`Attempting JIKAN API: ${url}`);

    try {
        const response = await fetch(url); // Await the fetch response
        console.log('Response status:', response.status); // Should log the status code

        if (response.ok) { // Checks if status is in the range 200-299
            const json = await response.json(); // Parse JSON if response is successful
            console.log(`JIKAN: Data Retrieved`);
            return { data: details, json: json };
        } else {
            console.error(`Bad response from JIKAN: ${response.status}`);
            return { data: details, json: null };
        }
    } catch (error) {
        console.error('Fetch error:', error); // Handle network errors
        return { data: details, json: null };
    }
}
async function fetchJikanAnimeEpisodes(animeID) {
    const url = `https://api.jikan.moe/v4/anime/${animeID}/episodes`;
    console.log(`Attempting JIKAN API: ${url}`);

    try {
        const response = await fetch(url); // Await the fetch response
        console.log('Response status:', response.status); // Should log the status code

        if (response.ok) { // Checks if status is in the range 200-299
            const json = await response.json(); // Parse JSON if response is successful
            console.log(`JIKAN: Data Retrieved`);
            return { animeID: animeID, json: json };
        } else {
            console.error(`Bad response from JIKAN: ${response.status}`);
            return { animeID: animeID, json: json };
        }
    } catch (error) {
        console.error('Fetch error:', error); // Handle network errors
        return { animeID: animeID, json: null };
    }
}
async function fetchJikanManga(details) {
    const url = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(details.title)}&limit=1`;
    console.log(`Attempting JIKAN API: ${url}`);

    try {
        const response = await fetch(url); // Await the fetch response
        console.log('Response status:', response.status); // Should log the status code

        if (response.ok) { // Checks if status is in the range 200-299
            const json = await response.json(); // Parse JSON if response is successful
            console.log(`JIKAN: Data Retrieved`);
            return { data: details, json: json };
        } else {
            console.error(`Bad response from JIKAN: ${response.status}`);
            return { data: details, json: null };
        }
    } catch (error) {
        console.error('Fetch error:', error); // Handle network errors
        return { data: details, json: null };
    }
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
    data.episode = episodeMatch ? episodeMatch[1] : settings.ie ? 1 : 0;
}
let isWindowCreated = false;
// Function to add episode to storage
function addEpisodeToStorage(jikan, tab, settings) {
    // If episode didn't match, and we're not allowed to skip
    if (jikan.episode == 0 && settings.ie == 0) {
        console.log(`Ignored: ${((settings.ot == 2) ? tab.title : tab.url).trim().toLowerCase()}, no episode data found.`);
        return;
    }
    // const episodes = getEpisodes();
    getEpisodes()
        .then((episodes) => {

            // chrome.storage.local.get('episodes', (_data) => {
            //     const episodes = _data.episodes || {};

            // Check if the title already exists in storage
            if (episodes[jikan.id]) {
                if (jikan.e <= episodes[jikan.id].e) {
                    console.log(`Episode already watched: ${jikan.id}. No updates made.`);
                } else if (isEpisodeSequential(jikan.e.toString(), episodes[jikan.id].e.toString()) || settings.forced) {
                    // Update the episode if it is sequential
                    episodes[jikan.id].d = settings.i; // we're changing URL, so we need to change the domain it links to as well
                    episodes[jikan.id].l = tab.url; // update URL
                    // episodes[data.title].season = data.season; // fix season in case we changed matching parameters
                    episodes[jikan.id].e = jikan.e;
                    episodes[jikan.id].r = jikan.e;
                    episodes[jikan.id].f = jikan.f;
                    episodes[jikan.id].u = Date.now();
                    console.log(`Updated: ${jikan.id} - Episode ${jikan.e}`);
                } else {
                    // Notify because the episode is tracked, but watched out of order
                    console.log(`Episode watched out of order for: ${jikan.id}. No updates made.`);
                    if (settings.n) {
                        //
                        // Generate a notification window to warn the user that they may have skipped an episode
                        //
                        const episodeUrl = encodeURIComponent(episodes[jikan.id].l); // encode the original URL
                        const episodeTitle = encodeURIComponent(episodes[jikan.id].t); // encode the original URL
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
                // Add the episode if it is Episode 1, or we're ignoring episode match, or we're forcably adding the episode
                if (parseInt(jikan.e) === 1 || settings.ie || settings.forced) {
                    //const domainID = Domains[domain].i;
                    episodes[jikan.id] = {
                        c: settings.c, // Match Domain Filter
                        d: settings.i,
                        f: jikan.f,
                        t: jikan.t,
                        e: jikan.e,
                        r: jikan.e,
                        n: jikan.n,
                        p: jikan.p,
                        l: new URL(tab.url).pathname, // URL Last Viewed
                        u: Date.now() // Track the time it was viewed
                    };
                    console.log(`Tracked: ${jikan.t} - Episode ${jikan.e} of ${jikan.n}`);
                } else {
                    // TODO: Handle force-track-episode
                    console.log(`Only Episode 1 can be added for new titles. Episode ${jikan.e} not tracked.`);
                }
            }

            // Save the updated episodes list back to storage
            // chrome.storage.local.set({ episodes });
            // console.log('Episodes saved:', episodes);
            saveEpisodes(episodes);

            chrome.runtime.sendMessage({ action: "reload" }, (response) => {
                if (chrome.runtime.lastError)
                ; // Ignore Error when user stops focusing

            });
            // });
        });
}

// Add episode to tracking (forced)
// function trackEpisode(domain, document, tab, settings) {
//     const data = getDetails(domain, document, tab, settings);
//     //const { matched, title, season, episode } = getEpisodeDetails(((settings.obtainTitleFrom == 2) ? tab.title : tab.url).trim().toLowerCase(), settings);

//     // TODO: Get title from API - https://api.jikan.moe/v4/anime?q=
//     fetchJikan(data)
//         .then(ret => {
//             if (!ret.json.data[0]) {
//                 console.error(`JIKAN Data[0] not Found`);
//                 return;
//             }
//             const id = ret.json.data[0].mal_id;
//             const titles = ret.json.data[0].titles;
//             let title = titles[0].title;
//             titles.forEach(t => {
//                 if (t.type == "English")
//                     title = t.title;
//             });
//             console.log(`JIKAN Success: ${id} / ${title}`);
//             // replace title
//             ret.data.title = title;

//             getEpisodes().then((episodes) => {

//                 var isnew = (episodes[ret.data.title]) ? false : true;

//                 episodes[ret.data.title] = {
//                     domain: domain,
//                     url: tab.url,
//                     title: ret.data.title,
//                     season: ret.data.season,
//                     episode: ret.data.episode,
//                     completed: ret.data.completed,
//                     viewedAt: Date.now() // Track the time it was viewed
//                 };
//                 saveEpisodes(episodes);
//                 // Save the updated list of episodes
//                 // chrome.storage.local.set({ episodes }, () => {
//                 //     if (isnew) {
//                 //         console.log(`Force Added: ${ret.data.title} - Season ${ret.data.season}, Episode ${ret.data.episode}`);
//                 //     } else {
//                 //         console.log(`Force Updated: ${ret.data.title} - Season ${ret.data.season}, Episode ${ret.data.episode}`);
//                 //     }
//                 //     console.log('Episodes after adding:', episodes);
//                 // });
//             });
//         })
//         .catch(error => console.error(`JIKAN Error: ${error}`));
// }

// Create an ID 1 incremented from the highest ID in Domains
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
async function trackDomain(domain) {
    // const Domains = getDomains();
    getDomains()
        .catch((error) => {
            console.error(`Failed to get Domains: ${error.name}: ${error.message}`);
        })
        .then((Domains) => {
            // console.log('Domains after Loading:', Domains);
            // if (!(domain in Domains)) {
            if (!Domains.hasOwnProperty(domain)) {
                const uid = createDomainId(Domains);

                Domains[domain] = {
                    i: uid,
                    c: 0, // Default Category to "Anime"
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
                console.log(`Domain ${domain} is now being tracked.`);
                chrome.runtime.sendMessage({ action: "reload" }, (response) => {
                    if (chrome.runtime.lastError)
                    ; // Ignore Error when user stops focusing

                });
            }
        });
}