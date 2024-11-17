// Listen for messages in popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "reload") {
        window.location.reload();
    }
});

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message; // Set the message
    notification.classList.remove('hidden'); // Show the notification
    notification.style.display = 'block'; // Ensure it's displayed

    // Automatically hide after 3 seconds
    setTimeout(() => {
        notification.classList.add('hidden'); // Hide the notification
    }, 3000);
}

const episodesListTab = document.getElementById('episodesList-tab');
const episodesCompletedTab = document.getElementById('episodesComplete-tab');

const episodesList = document.getElementById('episodesList');
const episodesCompleted = document.getElementById('episodesComplete');

// Add event listeners to tabs
episodesListTab.addEventListener('click', switchTab);
episodesCompletedTab.addEventListener('click', switchTab);

// Display the list of episodes for the current domain as cards
async function displayEpisodes(domain, url) {
    // const Domains = getDomains()
    getDomains()
        .then((Domains) => {
            const settings = Domains[domain];

            // const episodes = getEpisodes();
            getEpisodes()
                .then((episodes) => {
                    log('log', 'Filtering Episodes from :', episodes);
                    log('log', `Filtering Episodes for DomainID ${settings.i} `);
                    let domainEpisodes = [];
                    switch (settings.c) {
                        case 2:
                            // Other is not linked. Filter by domain
                            domainEpisodes = Object.fromEntries(Object.entries(episodes).filter(([id, ep]) => ep.d === settings.i));
                            break;
                        case 1:
                        case 0:
                        default:
                            // Anime or Manga are linked. Filter by matching category
                            domainEpisodes = Object.fromEntries(Object.entries(episodes).filter(([id, ep]) => ep.c === settings.c));
                            break;
                    }
                    // Filter episodes to this domain only
                    // const domainEpisodes = Object.fromEntries(Object.entries(episodes).filter(([id, ep]) => ep.d === settings.i));
                    // const domainEpisodes = Object.values(episodes).filter(ep => ep.d === settings.i);
                    log('log', `${Object.keys(domainEpisodes).length} Episodes to Display:`, domainEpisodes);
                    // Filter episodes to this category only
                    // const domainEpisodes = Object.values(episodes).filter(ep => ep.c === settings.c);

                    // Clear any previous content
                    episodesList.innerHTML = '';
                    episodesCompleted.innerHTML = '';

                    // Convert episodes object to an array to sort
                    const episodesArray = Object.entries(domainEpisodes);

                    // Sort episodes by `viewedAt` field (assuming it's a valid date string or Date object)
                    episodesArray.sort(([, a], [, b]) => {
                        switch (settings.s) {
                            case 1:
                                return a.t.localeCompare(b.t);
                                // return a.t - b.t;
                            case 2:
                                return b.t.localeCompare(a.t);
                                // return b.t - a.t;
                            case 0:
                            default:
                                const episodeA = new Date(a.u);
                                const episodeB = new Date(b.u);
                                return episodeB - episodeA; // Sort in descending order (most recent first)
                        }
                    });

                    if (Object.keys(episodesArray).length > 0) {
                        // if (episodesArray.length > 0) {
                        // for (let id in episodesArray) {
                        //     const episode = episodes[id];
                        episodesArray.forEach(([id, episode]) => {
                            // log('log','Rendering: ', episode.t);
                            const episodeListItem = document.createElement("li");
                            episodeListItem.classList.add("episode-item");

                            const episodeCard = document.createElement("a");
                            episodeCard.classList.add("episode-card");
                            // episodeCard.onclick = () => { chrome.tabs.create({ url: `${domain}/${episode.l}` }); };
                            const [targetDomain, targetSettings] = Object.entries(Domains).find(([d, s]) => s.i === episode.d);
                            episodeCard.href = `https://${targetDomain}${episode.l.startsWith("/")? "":"/"}${episode.l}`;
                            // Load bookmark in current tab if we're on the same domain, else, load in a new tab
                            // if (episode.d != settings.i)
                            episodeCard.target = '_blank'; // Open link in a new tab

                            const episodeThumbnail = document.createElement("img");
                            episodeThumbnail.classList.add("episode-thumb");
                            episodeThumbnail.src = episode.p;

                            const episodeInfo = document.createElement("div");
                            episodeInfo.classList.add("episode-info");

                            const title = document.createElement("div");
                            title.classList.add("episode-title");
                            title.textContent = episode.t;

                            // Create the tooltip element to show full title on hover
                            const tooltip = document.createElement("div");
                            tooltip.classList.add("tooltip");
                            tooltip.textContent = episode.t; // Full title here

                            const details = document.createElement("div");
                            details.classList.add("episode-details");
                            const det_span1 = document.createElement("span");
                            if (episode.c == 0)
                                if (episode.n == null)
                                    det_span1.textContent = `Episode ${episode.e} of ${episode.r} (??)`;
                                else
                                    det_span1.textContent = `Episode ${episode.e} of ${episode.r} (${episode.n})`;
                            else if (episode.c == 1)
                                det_span1.textContent = `Chapter ${episode.e}`;
                            else
                                det_span1.textContent = `Episode ${episode.e}`;
                            const det_span2 = document.createElement("span");
                            det_span2.textContent = `Updated ${new Date(episode.u).toLocaleString()}`;
                            details.appendChild(det_span1);
                            details.appendChild(det_span2);

                            const trashIcon = document.createElement('i');
                            trashIcon.className = 'fas fa-trash trash-icon';

                            trashIcon.addEventListener('click', (event) => {
                                event.stopPropagation();
                                event.preventDefault();

                                delete episodes[id];
                                saveEpisodes(episodes);
                                displayEpisodes(domain); // Re-render the list after deletion
                                // // Remove episode from storage
                                // chrome.storage.local.get('episodes', (data) => {
                                //     const episodes = data.episodes || {};
                                //     delete episodes[episode.t];
                                //     chrome.storage.local.set({ episodes }, () => {
                                //         displayEpisodes(domain); // Re-render the list after deletion
                                //     });
                                // });
                            });

                            // Add a complete icon (✓)
                            const completeIcon = document.createElement('i');
                            completeIcon.className = 'fas fa-solid fa-check';
                            if (episode.f)
                                completeIcon.className = 'fas fa-solid fa-star';

                            completeIcon.addEventListener('click', (event) => {
                                event.stopPropagation();
                                event.preventDefault();

                                toggleComplete(episodes, id);
                                saveEpisodes(episodes);
                                displayEpisodes(domain); // Re-render the list after deletion
                                // chrome.storage.local.set({ episodes }, () => {
                                //     displayEpisodes(domain); // Re-render the list after deletion
                                // });
                            });

                            // Append the title and details to the info div
                            episodeInfo.appendChild(title);
                            if (episode.t && episode.t.length > MAX_TITLE_LENGTH)
                                episodeCard.appendChild(tooltip); // Tooltip attached to card

                            episodeInfo.appendChild(details);

                            // Append episode info and delete icon to the card
                            // Only add the image in the event we HAVE a thumbnail
                            if (episode.p !== "")
                                episodeCard.appendChild(episodeThumbnail);
                            episodeCard.appendChild(episodeInfo);
                            episodeCard.appendChild(completeIcon);
                            episodeCard.appendChild(trashIcon);

                            episodeListItem.appendChild(episodeCard);
                            // Append the card to the list container
                            if (episode.f)
                                episodesCompleted.appendChild(episodeListItem);
                            else
                                episodesList.appendChild(episodeListItem);
                            // });
                        });
                    } else {
                        const noEpisodesMsg = document.createElement('div');
                        noEpisodesMsg.className = 'no-episodes';
                        noEpisodesMsg.textContent = 'No episodes tracked yet for this domain.';
                        episodesList.appendChild(noEpisodesMsg);
                    }
                });
        });
}

// Toggle episode complete state
function toggleComplete(episodes, id) {
    episodes[id].f = !episodes[id].f;

    log('log', `Episode ${episodes[id].t} set to ${episodes[id].f? 'completed' : 'incomplete'}.`);
}

// Switch between "All Episodes" and "Completed Episodes" tab
function switchTab(event) {
    if (event.target.id === 'episodesList-tab') {
        episodesList.style.display = 'block';
        episodesCompleted.style.display = 'none';
        episodesListTab.classList.add('active');
        episodesCompletedTab.classList.remove('active');
    } else {
        episodesList.style.display = 'none';
        episodesCompleted.style.display = 'block';
        episodesListTab.classList.remove('active');
        episodesCompletedTab.classList.add('active');
    }
}

// Show button to track the domain
async function showTrackButton(domain) {
    const contentDiv = document.getElementById('content');
    contentDiv.textContent = ``;

    const episodeListItem = document.createElement("li");
    episodeListItem.classList.add("episode-item");

    const episodeCard = document.createElement("a");
    episodeCard.classList.add("episode-card");

    const episodeInfo = document.createElement("div");
    episodeInfo.classList.add("episode-info");

    const title = document.createElement("div");
    title.classList.add("episode-warning");
    const alreadyhasPermission = await hasPermission(URL_PATTERN.replace('$d', domain));
    if (alreadyhasPermission)
        title.textContent = ``;
    else
        title.textContent = `This Extension requires permissions to read/write on this domain for the purposes of finding titles, episode/chapter numbers, and related text in the page content.`;
    episodeInfo.appendChild(title);

    const details = document.createElement("div");
    details.classList.add("warning-details");

    const trackButton = document.createElement('button');
    if (alreadyhasPermission)
        trackButton.textContent = `Track ${domain}`;
    else
        trackButton.textContent = `Request Permission`;

    trackButton.addEventListener('click', () => {
        chrome.permissions.request({
            origins: [URL_PATTERN.replace('$d', domain)]
        }, (granted) => {
            // The callback argument will be true if the user granted the permissions.
            if (granted) {
                chrome.runtime.sendMessage({ action: 'trackDomain', domain: domain });
                contentDiv.textContent = `${domain} is now being tracked. Reload to view episodes.`;
            } else {
                log('log', `Domain Permissions Refused for ${domain}`);
                contentDiv.textContent = `Domain Permissions Refused for ${domain}`;
            }
        });
    });
    details.appendChild(trackButton);

    episodeInfo.appendChild(details);
    episodeCard.appendChild(episodeInfo);
    episodeListItem.appendChild(episodeCard);
    contentDiv.appendChild(episodeListItem);
}

// Show button to track the domain
function showTrackEpButton(domain, tabId, url, title) {
    const contentDiv = document.getElementById('content');

    const trackButton = document.createElement('i');
    trackButton.className = 'fas fa-light fa-square-plus';

    trackButton.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();

        chrome.runtime.sendMessage({ action: 'trackEpisode', domain: domain, id: tabId, url: url, title: title });
        // window.location.reload(); // Force full page reload of popup.html
        // TODO: listen for background message to reload page
    });
    contentDiv.appendChild(trackButton);

    const exportButton = document.createElement('i');
    exportButton.className = 'fas fa-solid fa-file-export';

    exportButton.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();
        exportAsCSV();
        // window.location.reload(); // Force full page reload of popup.html
        // TODO: listen for background message to reload page
    });
    contentDiv.appendChild(exportButton);

    // contentDiv.appendChild(trackButton);
    const sortButton = document.createElement('i');
    sortButton.className = 'fas fa-solid fa-arrow-up-wide-short';
    sortButton.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();
        // const Domains = getDomains();
        getDomains().then((Domains) => {
            Domains[domain].s = Domains[domain].s + 1;
            if (Domains[domain].s >= sortBy.length)
                Domains[domain].s = 0;

            saveDomains(Domains);
            log('log', `Sorting cycled to ${sortBy[Domains[domain].s]} for ${domain}`);
            window.location.reload(); // Force full page reload of popup.html
        });
    });
    contentDiv.appendChild(sortButton);

}

// Check if the current domain is tracked and display relevant content
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const currentDomain = getDomainFromUrl(currentTab.url);

    // const Domains = getDomains();
    getDomains().then(async(Domains) => {
        const titleElem = document.getElementById('hostname');

        const spanElem = document.createElement("span");

        spanElem.textContent = `${currentDomain}`;
        titleElem.innerHTML = "";
        titleElem.appendChild(spanElem);

        if (Domains && Domains.hasOwnProperty(currentDomain)) {
            // Make sure we still have permissions for this domain
            const alreadyhasPermission = await hasPermission(URL_PATTERN.replace('$d', currentDomain));
            if (alreadyhasPermission) {
                const tabs = document.getElementById('tabs');
                tabs.style.display = "block";
                showTrackEpButton(currentDomain, currentTab.id, currentTab.url, currentTab.title);
                displayEpisodes(currentDomain, currentTab.url);
            } else {
                showTrackButton(currentDomain);
            }
        } else {
            showTrackButton(currentDomain);
        }
    });
});