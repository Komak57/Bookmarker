// Define some regex patterns to identify season and episode
const yearRegex = /[^a-z0-9]\b([12][90][0-9][0-9])\b[^a-z0-9]/i;
const seasonRegex_Rigid = /(?:(?:season|s)(\d+)|(\d+)[- ]?(?:th|rd|nd|st)?[- ]?(season|s))/i;
//const seasonRegex_Soft = /(?:[^\d]|^)(\d+)[- ]?(?:th|nd|st)?[- ]?season(?:[^\d]|$)/i;
const episodeRegex_Rigid = /(?:episode|ep|e|part|chapter|ch)?[- ]?(\d+(?:[a-z.]?\d+))$/i;
const episodeRegex_Simple = /(?:episode|ep|e|part|chapter|ch)?[- ]?(\d+(?:[a-z.]?\d+))\b/i;
const episodeRegex_Soft = /\b(\d+[a-z]?)\b/i;
const subRegex = /^(?:[^.]+\.)?([^.]+\.[^/]+.*$)/i;

// options.js
const fromOptions = ["URL", "Tab Text", "Content on Page"];
const sortBy = ["Last Viewed", "Ascending", "Descending"];
const categories = ["Anime", "Manga", "Movies", "Other"];

const MAX_TITLE_LENGTH = 73;

function delayExecution(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getVersion() {
    return new Promise((resolve, reject) => {
        // Load tracked domains
        chrome.storage.sync.get('Version', function(data) {
            if (chrome.runtime.lastError) {
                console.error(`Failed to get Version: ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`);
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
            console.error(`Failed to save Version: ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`);
            throw new Error(chrome.runtime.lastError.message);
        } else {
            console.log(`Version v${Version} saved as current version.`);
        }
    });
}

async function getDomains() {
    return await new Promise((resolve, reject) => {
        // Load tracked domains
        chrome.storage.sync.get('Domains', function(data) {
            if (chrome.runtime.lastError) {
                console.error(`Failed to get Domains: ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`);
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                if (data.Domains) {
                    console.log(`${Object.keys(data.Domains).length} Domains Exist in save:`, data.Domains);
                } else
                    console.log(`No Domains Existed in save`);
                // return data.Domains || [];
                // console.log('Outbound Domains is a ', typeof data.Domains);
                resolve(data.Domains || {});
            }
        });
    });
}

function saveDomains(Domains) {
    // console.log('Inbound Domains is a ', typeof Domains);
    chrome.storage.sync.set({ Domains }, () => {
        if (chrome.runtime.lastError) {
            console.error(`Failed to save Domains: ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`);
            throw new Error(chrome.runtime.lastError.message);
        } else {
            // console.log(`Domains Saved`);
            console.log('Domains after Saving:', Domains);
        }
    });
}

async function getEpisodes() {
    return new Promise((resolve, reject) => {
        // Load cloud-saved episode list
        chrome.storage.sync.get('Episodes', function(cloudData) {
            if (chrome.runtime.lastError) {
                console.error(`Failed to get cloudEpisodes: ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`);
                // return [];
                reject(new Error(`Failed to get localEpisodes: ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`));
            } else {
                let cloudEpisodes = cloudData.Episodes || {};
                // Load local-saved episode list
                chrome.storage.local.get('Episodes', function(localData) {
                    if (chrome.runtime.lastError) {
                        console.error(`Failed to get localEpisodes: ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`);
                        // return [];
                        reject(new Error(`Failed to get localEpisodes: ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`));
                    } else {
                        let localEpisodes = localData.Episodes || {};
                        // console.log(`${Object.keys(localEpisodes).length} Episodes Exist in save`);
                        let missingEpisodes = localData.Episodes || {};

                        // Purge any redundant Cloud Episodes
                        for (let id in cloudEpisodes) {
                            if (localEpisodes.hasOwnProperty(id)) {
                                delete cloudEpisodes[id];
                            }
                        }
                        if (Object.keys(cloudEpisodes).length > 0) {
                            // TODO: Queue remaining cloudEpisodes for API data retrieval
                            console.log(`${Object.keys(cloudEpisodes).length} Episodes from the Cloud need to be re-obtained.`);

                            for (let id in cloudEpisodes) {
                                localEpisodes[id] = {
                                    c: cloudEpisodes[id].c,
                                    d: cloudEpisodes[id].d,
                                    f: 0,
                                    t: `Title ${id}`,
                                    e: cloudEpisodes[id].e,
                                    n: cloudEpisodes[id].e,
                                    p: "",
                                    l: cloudEpisodes[id].l,
                                    u: Date.now()
                                }
                            }
                        }

                        if (localEpisodes)
                            console.log(`${Object.keys(localEpisodes).length} Episodes Exist after processing`);
                        else
                            console.log(`No Episodes Existed after processing`);
                        // console.log('Outbound Episodes is a ', typeof localEpisodes);
                        resolve(localEpisodes || {});
                        // return localEpisodes || [];
                    }
                });
            }
        });
    });
}

function saveEpisodes(localEpisodes) {
    // console.log(`Inbound Episodes is a ${typeof localEpisodes} of size ${JSON.stringify(localEpisodes).length}b`);
    // const _localEpisodes = Object.fromEntries(
    //     Object.entries(localEpisodes).map(([key, value]) => [key.toString(), value])
    // );

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
        console.error(`Cloud Episodes is a ${typeof cloudEpisodes} of size ${size}b`);
        console.log('String: ', JSON.stringify(cloudEpisodes));
    }
    chrome.storage.sync.set({ Episodes: cloudEpisodes }, () => {
        if (chrome.runtime.lastError) {
            console.error(`Error saving to storage.sync; ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`);
        } else {
            // console.log('Successfully exported data to storage.sync.');
            console.log('Cloud Episodes after Saving:', cloudEpisodes);
        }
    });

    // Save complete data locally
    // const Episodes = _localEpisodes;
    // console.log(`Cloud Episodes is a ${typeof localEpisodes} of size ${JSON.stringify(localEpisodes).length}b`);
    chrome.storage.local.set({ Episodes: localEpisodes }, () => {
        if (chrome.runtime.lastError) {
            console.error(`Error saving to storage.local; ${chrome.runtime.lastError.name}: ${chrome.runtime.lastError.message}`);
        } else {
            // console.log('Successfully saved data to storage.local.');
            console.log('Local Episodes after Saving:', localEpisodes);
        }
    });
}

// Function to get domain from URL
function getDomainFromUrl(url) {
    console.log('Constructing URL:', url);
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace(subRegex, "$1");
    } catch (er) {
        console.log('Unable to convert to URL');
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

// Version Updater to fix bugs when changes are made
function VersionUpdate() {
    // const lastVersion = getVersion() || "null";
    getVersion().then((lastVersion) => {
        const manifestData = chrome.runtime.getManifest();

        if (lastVersion != manifestData.version) {
            console.log("Attempting to update outdated variables for v", lastVersion);

            switch (lastVersion) {
                case manifestData.version: // 1.2.0
                    console.log(`Version v${lastVersion} already up to date.`);
                    break;
                default:
                    console.log(`Version Update could not patch from v${lastVersion} to ${manifestData.version}`);
                    // // Purge all save-data
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
            }
            saveVersion(manifestData.version);
        } else {
            console.log(`Version v${lastVersion} already up to date.`);
        }
    })
}