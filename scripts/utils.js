// Define some regex patterns to identify season and episode
const yearRegex = /[^a-z0-9]\b([12][90][0-9][0-9])\b[^a-z0-9]/i;
const seasonRegex_Rigid = /(?:(?:season|s)(\d+)|(\d+)[- ]?(?:th|rd|nd|st)?[- ]?(season|s))/i;
//const seasonRegex_Soft = /(?:[^\d]|^)(\d+)[- ]?(?:th|nd|st)?[- ]?season(?:[^\d]|$)/i;
const episodeRegex_Rigid = /(?:episode|ep|e|part|chapter|ch)?[- ]?(\d+(?:[a-z.-_]?(?:\d+)?)?)$/i;
const episodeRegex_Simple = /(?:episode|ep|e|part|chapter|ch)[- ]?(\d+(?:[a-z.-_]?(?:\d+)?)?)\b/i;
const episodeRegex_Soft = /\b(\d+(?:[a-z.-_]?\d+)?)\b/i;
const subRegex = /^(?:[^.]+\.)?([^.]+\.[^/]+.*$)/i;
const URL_PATTERN = 'https://*.$d/*';
const sfxRegex = /(\d+)([a-z]|[.-_](\d+))?/i;

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
    switch (type) {
        case 'error':
            if (args.length > 0)
                console.error(message, args);
            else
                console.error(message);
            break;
        case 'log':
            if (!DEBUGGING)
                return;
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

async function hasPermission(urlPattern) {
    return new Promise((resolve, reject) => {
        try {
            chrome.permissions.contains({ origins: [urlPattern] },
                (granted) => {
                    if (chrome.runtime.lastError)
                        reject(chrome.runtime.lastError);
                    if (granted)
                        resolve(granted);
                    else
                        resolve(false);
                    // reject(new Error(`Permission denied for ${urlPattern}`));
                }
            );
        } catch (err) {
            reject(err);
        }
        // reject(new Error(`hasPermissions can't be executed here.`));
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
                                    settings['a'] = cloudEpisodes[id].a;
                                    settings['i'] = cloudEpisodes[id].d;
                                    settings['c'] = cloudEpisodes[id].c;
                                    settings['cloud'] = true;
                                    // chrome.runtime.sendMessage({ action: 'trackBulk', domain: domain, domainEpisodes: missingEpisodes, settings: settings });
                                    apiManager.request({ id: id, title: null, season: 1, episode: localEpisodes[id].e }, { id: null, url: `https://${Domains[cloudEpisodes[id].d]}${cloudEpisodes[id].l.startsWith("/")? "":"/"}${cloudEpisodes[id].l}`, title: null }, settings);
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
            // Not finished, and uses an API that supports recovery from cloud save data
            if (localEpisodes[id].f == 0 && localEpisodes[id].a != 'Default' && localEpisodes[id].a != 'None') {
                cloudEpisodes[id] = {
                    a: localEpisodes[id].a,
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

function toEpisodeValue(episode) {
    const match = String(episode).match(sfxRegex);

    if (match)
        log('log', `toEpisodeValue: ${episode} matches[${match.length}]`);
    else
        log('log', `toEpisodeValue: ${episode} matches[null]`);

    const ep = parseInt(match[1]);
    let sfx = match[2];
    if (match[3])
        sfx = parseInt(match[3]);

    if (sfx) {
        // We have a sfx
        if (match[3]) {
            // suffix is numerical
            log('log', `toEpisodeValue: ${episode} -> ${(ep + Math.pow(10, String(sfx).length))}`);
            return ep + Math.pow(10, String(sfx).length);
        }
        // suffix is alphabetical
        log('log', `toEpisodeValue: ${episode} -> ${(ep + Math.pow(10, String(sfx.charCodeAt(0)).length))}`);
        return ep + Math.pow(10, String(sfx.charCodeAt(0)).length);
    } else {
        // We didn't have a suffix
        log('log', `toEpisodeValue: ${episode} -> ${(ep)}`);
        return ep;
    }
}
// Function to determine if the episode is 1 incremented from previous
// Also allows for alpha "parts" as well as decimal "parts"
function isEpisodeSequential(newEpisode, savedEpisode) {
    // log('log', `isEpisodeSequential: ${savedEpisode}->${newEpisode}`);
    const newEpisode_match = String(newEpisode).match(sfxRegex);
    const savedEpisode_match = String(savedEpisode).match(sfxRegex);

    const newEpisode_ep = parseInt(newEpisode_match[1]);
    let newEpisode_sfx = newEpisode_match[2];
    if (newEpisode_match[3])
        newEpisode_sfx = parseInt(newEpisode_match[3]);

    const savedEpisode_ep = parseInt(savedEpisode_match[1]);
    let savedEpisode_sfx = savedEpisode_match[2];
    if (savedEpisode_match[3])
        savedEpisode_sfx = parseInt(savedEpisode_match[3]);

    // log('log', `${savedEpisode} -> ${newEpisode} || ${newEpisode? 'has SFX': ''} ${savedEpisode_sfx? 'had SFX': ''} ${(newEpisode_ep == savedEpisode_ep + 1)? 'seq ep': 'nonseq ep'} ${(newEpisode_ep == savedEpisode_ep + 1)? 'seq numeric sfx':'nonseq numeric sfx' } ${(newEpisode_sfx.charCodeAt(0) == savedEpisode_sfx.charCodeAt(0))? 'seq alpha sfx':'nonseq alpha sfx'} `);
    // If we had a suffix...
    if (savedEpisode_sfx) {
        // But now we don't...
        if (!newEpisode_sfx) {
            // log('log', `had sfx, retun isSeq_Ep`);
            return newEpisode_ep == savedEpisode_ep + 1; // Only allow if we incremented the episode
        }
        if (newEpisode_match[3]) {
            // log('log', `has num_sfx, retun isSeq_sfx`);
            return newEpisode_sfx == savedEpisode_sfx + 1; // If working with decimal parts, allow in seq
        }
        // episode has increased, We had a suffix, and still have one, suffix must reset
        if (newEpisode_ep == savedEpisode_ep + 1) {
            // log('log', `has alpha_sfx, isSeq_ep(true), retun isSfx_new`);
            return newEpisode_sfx == 1 || newEpisode_sfx.toLowerCase() == "a";
        }
        // log('log', `has alpha_sfx, retun isSeq_sfx(${newEpisode_sfx.charCodeAt(0)} == ${savedEpisode_sfx.charCodeAt(0)}+1 is ${newEpisode_sfx.charCodeAt(0) == savedEpisode_sfx.charCodeAt(0)+1})`);
        // else, only allow sequential letters
        return newEpisode_sfx.charCodeAt(0) == savedEpisode_sfx.charCodeAt(0) + 1;
    } else {
        // We didn't have a suffix
        // But now we do...
        if (newEpisode_sfx)
            return newEpisode_sfx == 1 || newEpisode_sfx.toLowerCase() == "a"; // Only allow first-increment
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
                    csvContent = "\nDomains\nDomain|ID|API|Cat|ObtainTitleFrom|TitleMatch|ObtainSeasonFrom|SeasonMatch|ObtainEpisodeFrom|EpisodeMatch|IgnoreEpisode|Notify|SortBy\n";

                    // Process Domains
                    for (const [domain, settings] of Object.entries(domains)) {
                        const row = `${domain}|${settings.i || 'null'}|${settings.a || 'Default'}|${settings.c || '0'}|${settings.ot || '0'}|${settings.otm || ''}|${settings.os || '0'}|${settings.osm || ''}|${settings.oe || '0'}|${settings.oem || ''}|${settings.ie || 'false'}|${settings.n || 'true'}|${settings.s || '0'}`; // Customize fields
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

function importCSV(file) {
    return new Promise((resolve, reject) => {

        getDomains()
            .then((domains) => {
                getEpisodes()
                    .then((episodes) => {
                        const reader = new FileReader();

                        reader.onload = (event) => {
                            const content = event.target.result;
                            const lines = content.split("\n").filter(line => line.trim() !== '');

                            let targetStorage = 0;
                            let newDomains = 0;
                            let newEpisodes = 0;
                            const translations = {};

                            lines.forEach((line, index) => {
                                if (line == "") {
                                    // empty spacer
                                } else if (line == "Domains") {
                                    // Target Domain Storage
                                    targetStorage = 1;
                                    log('log', 'Now parsing Domains');
                                } else if (line == "Episodes") {
                                    // Target Episode Storage
                                    targetStorage = 2;
                                    log('log', 'Now parsing Episodes');
                                } else {
                                    if (targetStorage == 1) {
                                        // Expecting Domain Data
                                        const [domain, id, api, cat, ot, otm, os, osm, oe, oem, ignoreEpisode, notify, sortby] = line.split("|");
                                        // Sanity Check Data
                                        let _id = parseInt(id);
                                        // Only accept valid ID's
                                        if (!isNaN(_id)) {
                                            if (domains.hasOwnProperty(domain)) {
                                                // log('log', `Matching Domain ${domain} (${_id} -> ${domains[domain].i})`);
                                                if (domains[domain].i != _id) {
                                                    // domain ID's differ, mark for translation
                                                    translations[_id] = domains[domain].i;
                                                    log('log', `Translation required for ${domain} (${_id} -> ${domains[domain].i})`);
                                                }
                                            } else {
                                                newDomains++;
                                                log('log', 'New Domain: ', domain);
                                            }
                                            domains[domain] = {
                                                i: _id,
                                                a: api,
                                                c: parseInt(cat),
                                                ot: parseInt(ot),
                                                otm: otm,
                                                os: parseInt(os),
                                                osm: osm,
                                                oe: parseInt(oe),
                                                oem: oem,
                                                ie: (ignoreEpisode == "true" ? 1 : 0),
                                                n: (notify == "true" ? 1 : 0),
                                                s: parseInt(sortby)
                                            };
                                        }
                                    } else if (targetStorage == 2) {
                                        // Expecting Episode Data
                                        const [id, cat, domain, title, episode, released, number, pic, link, finished, updated] = line.split("|");
                                        // Sanity Check Data
                                        let _id = parseInt(id);
                                        if (!isNaN(_id)) {
                                            // translate where necessary
                                            let _domain = parseInt(domain);
                                            if (translations.hasOwnProperty(domain))
                                                _domain = translations[domain];
                                            // Skip if we don't have a domain for this episode
                                            const hasDomainTarget = Object.fromEntries(Object.entries(domains).filter(([d, settings]) => settings.i === _domain));
                                            if (Object.keys(hasDomainTarget).length > 0) {

                                                if (!episodes.hasOwnProperty(_id)) {
                                                    newEpisodes++;
                                                    log('log', 'New Episode: ', title);
                                                }
                                                episodes[_id] = {
                                                    c: parseInt(cat),
                                                    d: parseInt(_domain),
                                                    f: (finished == "true" ? 1 : 0),
                                                    t: title,
                                                    e: episode,
                                                    r: parseInt(released),
                                                    n: parseInt(number),
                                                    p: pic,
                                                    l: link,
                                                    u: parseInt(updated)
                                                };
                                            } else {
                                                log('log', `Episode ${title}[${id}] skipped. Domain no longer exists.`);
                                            }
                                        } else {
                                            // TODO: send it through the APIManager
                                        }
                                    }
                                }
                            });

                            console.log(`Importing ${newDomains} new domains: `, domains);
                            console.log(`Importing ${newEpisodes} new episodes: `, episodes);
                            saveDomains(domains);
                            saveEpisodes(episodes);
                            resolve(true);
                        };

                        reader.onerror = (error) => reject(error);

                        reader.readAsText(file);
                    });
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
                                    saveVersion('1.3.0');
                                case '1.4':
                                    log('log', `No Changes Required for v1.4`);
                                    saveVersion('1.4.0');
                                case '1.5':
                                    saveEpisodes(episodes);
                                    // TODO: add API target from domain.category
                                    for (const domain of Object.keys(domains)) {
                                        // Fix all episodes by moving them to domain.category (in case they were changed)
                                        for (const id of Object.keys(episodes)) {
                                            if (episodes[id].d == domains[domain].i) {
                                                episodes[id].c = domains[domain].c; // Transfer to domain category
                                            }
                                        }
                                        switch (categories[domains[domain].c]) {
                                            case 'Anime':
                                                domains[domain]['a'] = JIKAN_Anime.alias;
                                                break;
                                            case 'Manga':
                                                domains[domain]['a'] = JIKAN_Manga.alias;
                                                break;
                                            case 'Movies':
                                            case 'Other':
                                            default:
                                                domains[domain]['a'] = InternalAPI.alias;
                                        }
                                    }
                                    saveDomains(domains);

                                    // We'll update to manifestData.version anyways
                                    if (`${major}.${minor}` != `${_major}.${_minor}`)
                                        saveVersion('1.5.0');
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
    static classes = {};
    // throttle = 'default';
    // static delay = 0;
    constructor() {
        this.throttle = 'none';
        this.delay = 0;
    }
    static register(name, subclass) {
        this.classes[name] = subclass;
    }
    static {
        this.alias = 'None';
        APIClass.register(this.alias, new APIClass());
    }
    async fetch(details, tab, settings) {
        log('warn', 'APIClass "None" does not implement fetch().');
        // throw new Error('APIClass "None" does not implement fetch().');
        return null;
    }
    levenshtein(s, t) {
        if (s === t) {
            return 0;
        }
        var n = s.length,
            m = t.length;
        if (n === 0 || m === 0) {
            return n + m;
        }
        var x = 0,
            y, a, b, c, d, g, h, k;
        var p = new Array(n);
        for (y = 0; y < n;) {
            p[y] = ++y;
        }

        for (;
            (x + 3) < m; x += 4) {
            var e1 = t.charCodeAt(x);
            var e2 = t.charCodeAt(x + 1);
            var e3 = t.charCodeAt(x + 2);
            var e4 = t.charCodeAt(x + 3);
            c = x;
            b = x + 1;
            d = x + 2;
            g = x + 3;
            h = x + 4;
            for (y = 0; y < n; y++) {
                k = s.charCodeAt(y);
                a = p[y];
                if (a < c || b < c) {
                    c = (a > b ? b + 1 : a + 1);
                } else {
                    if (e1 !== k) {
                        c++;
                    }
                }

                if (c < b || d < b) {
                    b = (c > d ? d + 1 : c + 1);
                } else {
                    if (e2 !== k) {
                        b++;
                    }
                }

                if (b < d || g < d) {
                    d = (b > g ? g + 1 : b + 1);
                } else {
                    if (e3 !== k) {
                        d++;
                    }
                }

                if (d < g || h < g) {
                    g = (d > h ? h + 1 : d + 1);
                } else {
                    if (e4 !== k) {
                        g++;
                    }
                }
                p[y] = h = g;
                g = d;
                d = b;
                b = c;
                c = a;
            }
        }

        for (; x < m;) {
            var e = t.charCodeAt(x);
            c = x;
            d = ++x;
            for (y = 0; y < n; y++) {
                a = p[y];
                if (a < c || d < c) {
                    d = (a > d ? d + 1 : a + 1);
                } else {
                    if (e !== s.charCodeAt(y)) {
                        d = c + 1;
                    } else {
                        d = c;
                    }
                }
                p[y] = d;
                c = a;
            }
            h = d;
        }

        return h;
    }
}