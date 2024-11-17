// Define some regex patterns to identify season and episode
const yearRegex = /[^a-z0-9]\b([12][90][0-9][0-9])\b[^a-z0-9]/i;
const seasonRegex_Rigid = /(?:(?:season|s)(\d+)|(\d+)[- ]?(?:th|rd|nd|st)?[- ]?(season|s))/i;
//const seasonRegex_Soft = /(?:[^\d]|^)(\d+)[- ]?(?:th|nd|st)?[- ]?season(?:[^\d]|$)/i;
const episodeRegex_Rigid = /(?:episode|ep|e|part|chapter|ch)?[- ]?(\d+(?:[a-z.]?(?:\d+)?)?)$/i;
const episodeRegex_Simple = /(?:episode|ep|e|part|chapter|ch)[- ]?(\d+(?:[a-z.]?(?:\d+)?)?)\b/i;
const episodeRegex_Soft = /\b(\d+(?:[a-z.]?\d+)?)\b/i;
const subRegex = /^(?:[^.]+\.)?([^.]+\.[^/]+.*$)/i;
const URL_PATTERN = 'https://*.$d/*';

// options.js
const fromOptions = ["URL", "Tab Text", "Content on Page"];
const sortBy = ["Last Viewed", "Ascending", "Descending"];
const categories = ["Anime", "Manga", "Movies", "Other"];

const MAX_TITLE_LENGTH = 73;
const DEBUGGING = true;

function log(type, ...msg) {
    let message = "";
    let args = [];
    for (const m of msg) {
        if (typeof m === "string")
            message = message + " " + m;
        else
            args.push(m);
        // message = message + " " + JSON.stringify(m);
    }
    // const message = msg.join('');
    if (!DEBUGGING)
        return;
    switch (type) {
        case 'error':
            if (args.length > 0)
                console.error(message, args);
            else
                console.error(message);
            break;
        case 'log':
            if (args.length > 0)
                console.log(message, args);
            else
                console.log(message);
            break;
        case 'warn':
            if (args.length > 0)
                console.warn(message, args);
            else
                console.warn(message);
            break;
        case 'info':
            if (args.length > 0)
                console.info(message, args);
            else
                console.info(message);
            break;
        case 'debug':
            if (args.length > 0)
                console.debug(message, args);
            else
                console.debug(message);
            break;
        default:
            if (args.length > 0)
                console.log(message, args);
            else
                console.log(message);
    }
}

function delayExecution(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function hasPermission(urlPattern) {
    return new Promise((resolve) => {
        chrome.permissions.contains({ origins: [urlPattern] },
            (result) => {
                resolve(result);
            }
        );
    });
}
async function getVersion() {
    return new Promise((resolve, reject) => {
        // Load tracked domains
        chrome.storage.sync.get('Version', function(data) {
            if (chrome.runtime.lastError) {
                log('error', `Failed to get Version: ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`);
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(data.Version || "null");
            }
        });
    });
}

function saveVersion(Version) {
    chrome.storage.sync.set({ Version }, () => {
        if (chrome.runtime.lastError) {
            log('error', `Failed to save Version: ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`);
            throw new Error(chrome.runtime.lastError.message);
        } else {
            log('log', `Version v${Version} saved as current version.`);
        }
    });
}

async function getDomains() {
    return await new Promise((resolve, reject) => {
        // Load tracked domains
        chrome.storage.sync.get('Domains', function(data) {
            if (chrome.runtime.lastError) {
                log('error', `Failed to get Domains: ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`);
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                if (data.Domains) {
                    log('log', `${Object.keys(data.Domains).length} Domains Exist in save:`, data.Domains);
                } else
                    log('log', `No Domains Existed in save`);
                // return data.Domains || [];
                // log('log','Outbound Domains is a ', typeof data.Domains);
                resolve(data.Domains || {});
            }
        });
    });
}

function saveDomains(Domains) {
    return new Promise((resolve, reject) => {
        // log('log','Inbound Domains is a ', typeof Domains);
        chrome.storage.sync.set({ Domains }, () => {
            if (chrome.runtime.lastError) {
                log('error', `Failed to save Domains: ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`);
                // throw new Error(chrome.runtime.lastError.message);
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                // log('log',`Domains Saved`);
                log('log', 'Domains after Saving:', Domains);
                resolve(true);
            }
        });
    });
}

async function getEpisodes() {
    return new Promise((resolve, reject) => {
        // Load cloud-saved episode list
        chrome.storage.sync.get('Episodes', function(cloudData) {
            if (chrome.runtime.lastError) {
                log('error', `Failed to get cloudEpisodes: ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`);
                // return [];
                reject(new Error(`Failed to get localEpisodes: ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`));
            } else {
                let cloudEpisodes = cloudData.Episodes || {};
                // Load local-saved episode list
                chrome.storage.local.get('Episodes', function(localData) {
                    if (chrome.runtime.lastError) {
                        log('error', `Failed to get localEpisodes: ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`);
                        // return [];
                        reject(new Error(`Failed to get localEpisodes: ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`));
                    } else {
                        let localEpisodes = localData.Episodes || {};
                        // log('log',`${Object.keys(localEpisodes).length} Episodes Exist in save`);
                        let missingEpisodes = localData.Episodes || {};

                        // Purge any redundant Cloud Episodes
                        for (let id in cloudEpisodes) {
                            if (localEpisodes.hasOwnProperty(id)) {
                                delete cloudEpisodes[id];
                            }
                        }
                        if (Object.keys(cloudEpisodes).length > 0) {
                            // TODO: Queue remaining cloudEpisodes for API data retrieval
                            log('log', `${Object.keys(cloudEpisodes).length} Episodes from the Cloud need to be re-obtained.`);
                            getDomains().then((Domains) => {
                                for (let id in cloudEpisodes) {
                                    // Add temporary details immediately
                                    localEpisodes[id] = {
                                            c: cloudEpisodes[id].c,
                                            d: cloudEpisodes[id].d,
                                            f: 0,
                                            t: `Title ${id}`,
                                            e: cloudEpisodes[id].e,
                                            r: cloudEpisodes[id].e,
                                            n: cloudEpisodes[id].e,
                                            p: "",
                                            l: cloudEpisodes[id].l,
                                            u: Date.now()
                                        }
                                        // Send an API Request to get additional details later...

                                    settings['cloud'] = true;
                                    apiManager.request(categories[settings.c], details, { id: null, url: `https://${Domains[cloudEpisodes[id].d]}${cloudEpisodes[id].l.startsWith("/")? "":"/"}${cloudEpisodes[id].l}`, title: null }, settings);
                                }
                            });
                        }

                        if (localEpisodes)
                            log('log', `${Object.keys(localEpisodes).length} Episodes Exist after processing`);
                        else
                            log('log', `No Episodes Existed after processing`);
                        // log('log','Outbound Episodes is a ', typeof localEpisodes);
                        resolve(localEpisodes || {});
                        // return localEpisodes || [];
                    }
                });
            }
        });
    });
}

function saveEpisodes(localEpisodes) {
    return new Promise((resolve, reject) => {
        // Filter minimal necessary information for cloud storage
        let cloudEpisodes = {};
        for (let id in localEpisodes) {
            // Not finished, and a category that supports recovery from cloud save data
            if (localEpisodes[id].f == 0 && localEpisodes[id].c <= 1) {
                cloudEpisodes[id] = {
                    c: localEpisodes[id].c,
                    d: localEpisodes[id].d,
                    e: localEpisodes[id].e,
                    l: localEpisodes[id].l
                }
            }
        }
        const size = JSON.stringify(cloudEpisodes).length;
        if (size > chrome.storage.sync.QUOTA_BYTES_PER_ITEM) {
            log('error', `Cloud Episodes is a ${typeof cloudEpisodes} of size ${size}b`);
            log('log', 'String: ', JSON.stringify(cloudEpisodes));
            reject(new Error(`Cloud Episodes is a ${typeof cloudEpisodes} of size ${size}b`));
        }
        chrome.storage.sync.set({ Episodes: cloudEpisodes }, () => {
            if (chrome.runtime.lastError) {
                log('error', `Error saving to storage.sync; ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`);
                reject(new Error(`Error saving to storage.sync; ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`));
            } else {
                // log('log','Successfully exported data to storage.sync.');
                log('log', 'Cloud Episodes after Saving:', cloudEpisodes);
            }
        });

        // Save complete data locally
        // const Episodes = _localEpisodes;
        // log('log',`Cloud Episodes is a ${typeof localEpisodes} of size ${JSON.stringify(localEpisodes).length}b`);
        chrome.storage.local.set({ Episodes: localEpisodes }, () => {
            if (chrome.runtime.lastError) {
                log('error', `Error saving to storage.local; ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`);
                reject(new Error(`Error saving to storage.sync; ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`));
            } else {
                // log('log','Successfully saved data to storage.local.');
                log('log', 'Local Episodes after Saving:', localEpisodes);
            }
        });
        resolve(true);
    });
}

// Function to get domain from URL
function getDomainFromUrl(url) {
    log('log', 'Constructing URL:', url);
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace(subRegex, "$1");
    } catch (er) {
        log('log', 'Unable to convert to URL');
        return url.replace(subRegex, "$1");
    }
}

function normalizeUrl(url) {
    return url.trim().toLowerCase(); // Normalize URL
}

// Function to determine if the episode is 1 incremented from previous
// Also allows for alpha "parts" as well as decimal "parts"
function isEpisodeSequential(newEpisode, savedEpisode) {
    const newEpisode_match = String(newEpisode).match(/(\d+)([a-z]?|[.](\d+))$/);
    const savedEpisode_match = String(savedEpisode).match(/(\d+)([a-z]?|[.](\d+))$/);

    const newEpisode_ep = parseInt(newEpisode_match[1]);
    let newEpisode_sfx = newEpisode_match[2];
    if (newEpisode_match[3])
        newEpisode_sfx = parseInt(newEpisode_match[3]);

    const savedEpisode_ep = parseInt(savedEpisode_match[1]);
    let savedEpisode_sfx = savedEpisode_match[2];
    if (savedEpisode_match[3])
        savedEpisode_sfx = parseInt(savedEpisode_match[3]);

    // If we had a suffix...
    if (savedEpisode_sfx) {
        // But now we don't...
        if (!newEpisode_sfx)
            return newEpisode_ep == savedEpisode_ep + 1; // Only allow if we incremented the episode
        if (newEpisode_match[3])
            return newEpisode_sfx == savedEpisode_sfx + 1; // If working with decimal parts, allow in seq
        // else, only allow sequential letters
        return newEpisode_sfx.charCodeAt(0) == savedEpisode_sfx.charCodeAt(0);
    } else {
        // We didn't have a suffix
        // But now we do...
        if (newEpisode_sfx)
            return newEpisode_sfx == 1 || newEpisode_sfx == "a"; // Only allow first-increment
        return newEpisode_ep == savedEpisode_ep + 1;
    }
}

function exportAsCSV() {
    getDomains()
        .then((domains) => {
            getEpisodes()
                .then((episodes) => {
                    if (chrome.runtime.lastError) {
                        log('error', "Error retrieving data:", chrome.runtime.lastError);
                        return;
                    }
                    // Generate Header
                    csvContent = "\nDomains\nDomain|ID|Cat|ObtainTitleFrom|TitleMatch|ObtainSeasonFrom|SeasonMatch|ObtainEpisodeFrom|EpisodeMatch|IgnoreEpisode|Notify|SortBy\n";

                    // Process Domains
                    for (const [domain, settings] of Object.entries(domains)) {
                        const row = `${domain}|${settings.i || 'null'}|${settings.c || '0'}|${settings.ot || '0'}|${settings.otm || ''}|${settings.os || '0'}|${settings.osm || ''}|${settings.oe || '0'}|${settings.oem || ''}|${settings.ie || 'false'}|${settings.n || 'true'}|${settings.s || '0'}`; // Customize fields
                        csvContent += row + "\n";
                    }

                    // Generate Header
                    csvContent += "\nEpisodes\nID|Cat|DomainID|Title|Episode|Released|Episodes|Thumbnail|URL|Finished|Updated\n";

                    // Process Episodes
                    for (const [id, episode] of Object.entries(episodes)) {
                        const row = `${id || 'null'}|${episode.c || '0'}|${episode.d || 'null'}|${episode.t || ''}|${episode.e || '1'}|${episode.r || '0'}|${episode.n || '0'}|${episode.p || ''}|${episode.l || ''}|${episode.f || 'false'}|${episode.u || 'null'}`; // Customize fields
                        csvContent += row + "\n";
                    }

                    // Trigger CSV download
                    downloadCSV(csvContent, "exported_data.csv");
                });
        });
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url); // Clean up
}

// Version Updater to fix bugs when changes are made
function VersionUpdate() {
    // const lastVersion = getVersion() || "null";
    getVersion().then((lastVersion) => {
        const manifestData = chrome.runtime.getManifest();
        if (lastVersion != manifestData.version) {
            log('log', "Attempting to update outdated variables for v", lastVersion);

            getDomains()
                .then((domains) => {
                    getEpisodes()
                        .then((episodes) => {
                            const [major, minor, patch] = lastVersion.split('.');
                            const [_major, _minor, _patch] = manifestData.version.split('.');
                            switch (`${major}.${minor}`) {
                                case '1.2': // 1.2.0
                                    log('log', `No Changes Required for v1.2`);
                                    saveVersion('1.2.0');
                                case '1.3': // 1.3.0
                                    for (let id in episodes) {
                                        // Update episode to add current number of episodes
                                        episodes[id]['r'] = episodes[id].e;
                                    }
                                    saveEpisodes(episodes);
                                    log('log', `Updated all episodes to implement released episode counts Required for v1.3`);
                                    // We'll update to manifestData.version anyways
                                    if (`${major}.${minor}` != `${_major}.${_minor}`)
                                        saveVersion('1.3.0');
                                case `${_major}.${_minor}`:
                                    log('log', `No Further Changes Required for v${manifestData.version}`);
                                    saveVersion(manifestData.version);
                                    break;
                                default:
                                    log('log', `Version Update could not patch from v${lastVersion} to ${manifestData.version}`);
                                    // // Purge all save-data
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
                                    saveVersion(manifestData.version); // Assume current version
                            }
                        });
                });
        } else {
            log('log', `Version v${lastVersion} already up to date.`);
        }
    });
}