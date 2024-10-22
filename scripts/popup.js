// Function to get domain from URL
function getDomainFromUrl(url) {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
}

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
function displayEpisodes(domain, url) {

    chrome.storage.local.get('trackedDomains', (data) => {
        const trackedDomains = data.trackedDomains || [];
        settings = trackedDomains[domain];

        chrome.storage.local.get('episodes', (data) => {
            const episodes = data.episodes || {};
            const domainEpisodes = Object.values(episodes).filter(ep => ep.domain === domain);
            // Clear any previous content
            episodesList.innerHTML = '';
            episodesCompleted.innerHTML = '';

            // Convert episodes object to an array to sort
            const episodesArray = Object.entries(domainEpisodes);

            // Sort episodes by `viewedAt` field (assuming it's a valid date string or Date object)
            episodesArray.sort((a, b) => {
                switch (settings.sortBy) {
                    case 1:
                        return a[1].title - b[1].title;
                    case 2:
                        return b[1].title - a[1].title;
                    case 0:
                    default:
                        const episodeA = new Date(a[1].viewedAt);
                        const episodeB = new Date(b[1].viewedAt);
                        return episodeB - episodeA; // Sort in descending order (most recent first)
                }
            });

            if (episodesArray.length > 0) {
                episodesArray.forEach(([url, episode, completed]) => {
                    const episodeListItem = document.createElement("li");
                    episodeListItem.classList.add("episode-item");

                    const episodeCard = document.createElement("a");
                    episodeCard.classList.add("episode-card");
                    episodeCard.onclick = () => { chrome.tabs.create({ url: episode.url }); };
                    episodeCard.target = '_blank'; // Open link in a new tab

                    const episodeInfo = document.createElement("div");
                    episodeInfo.classList.add("episode-info");

                    const title = document.createElement("div");
                    title.classList.add("episode-title");
                    title.textContent = episode.title;

                    // Create the tooltip element to show full title on hover
                    const tooltip = document.createElement("div");
                    tooltip.classList.add("tooltip");
                    tooltip.textContent = episode.title; // Full title here

                    const details = document.createElement("div");
                    details.classList.add("episode-details");
                    const det_span1 = document.createElement("span");
                    det_span1.textContent = `Season ${episode.season}, Episode ${episode.episode}`;
                    const det_span2 = document.createElement("span");
                    det_span2.textContent = `Updated ${new Date(episode.viewedAt).toLocaleString()}`;
                    details.appendChild(det_span1);
                    details.appendChild(det_span2);

                    const trashIcon = document.createElement('i');
                    trashIcon.className = 'fas fa-trash trash-icon';

                    trashIcon.addEventListener('click', (event) => {
                        event.stopPropagation();
                        event.preventDefault();

                        // Remove episode from storage
                        chrome.storage.local.get('episodes', (data) => {
                            const episodes = data.episodes || {};
                            delete episodes[episode.title];
                            chrome.storage.local.set({ episodes }, () => {
                                displayEpisodes(domain); // Re-render the list after deletion
                            });
                        });
                    });

                    // Add a complete icon (✓)
                    const completeIcon = document.createElement('i');
                    completeIcon.className = 'fas fa-solid fa-check';
                    if (episode.completed)
                        completeIcon.className = 'fas fa-solid fa-star';

                    completeIcon.addEventListener('click', (event) => {
                        event.stopPropagation();
                        event.preventDefault();

                        toggleComplete(episodes, episode.title);
                        chrome.storage.local.set({ episodes }, () => {
                            displayEpisodes(domain); // Re-render the list after deletion
                        });
                    });

                    // Append the title and details to the info div
                    episodeInfo.appendChild(title);
                    if (episode.title && episode.title.length > 73)
                        episodeCard.appendChild(tooltip); // Tooltip attached to card

                    episodeInfo.appendChild(details);

                    // Append episode info and delete icon to the card
                    episodeCard.appendChild(episodeInfo);
                    episodeCard.appendChild(completeIcon);
                    episodeCard.appendChild(trashIcon);

                    episodeListItem.appendChild(episodeCard);
                    // Append the card to the list container
                    if (episode.completed)
                        episodesCompleted.appendChild(episodeListItem);
                    else
                        episodesList.appendChild(episodeListItem);
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
function toggleComplete(episodes, title) {
    episodes[title].completed = !episodes[title].completed;

    // Save updated episode list to storage (for persistence)
    chrome.storage.local.set({ episodes }, () => {
        console.log(`Episode ${title} set to ${episodes[title].completed? 'completed' : 'incomplete'}.`);
    });
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
function showTrackButton(domain) {
    const contentDiv = document.getElementById('content');
    const trackButton = document.createElement('button');
    trackButton.textContent = `Track ${domain}`;

    trackButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'trackDomain', domain: domain });
        contentDiv.textContent = `${domain} is now being tracked. Reload to view episodes.`;
    });

    contentDiv.appendChild(trackButton);
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
        window.location.reload(); // Force full page reload of popup.html
    });
    contentDiv.appendChild(trackButton);

    // contentDiv.appendChild(trackButton);

    const sortButton = document.createElement('i');
    sortButton.className = 'fas fa-solid fa-arrow-up-wide-short';
    sortButton.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();
        // Cycle Sort
        chrome.storage.local.get('trackedDomains', (data) => {
            const trackedDomains = data.trackedDomains || [];
            trackedDomains[domain].sortBy = trackedDomains[domain].sortBy + 1;
            if (trackedDomains[domain].sortBy > 2)
                trackedDomains[domain].sortBy = 0;

            // Implement actual saving logic here using chrome.storage if needed
            chrome.storage.local.set({ trackedDomains }, () => {
                console.log(`Sorting cycled to ${trackedDomains[domain].sortBy} for ${domain}`);
            });
            window.location.reload(); // Force full page reload of popup.html
        });

    });
    contentDiv.appendChild(sortButton);

}

// Check if the current domain is tracked and display relevant content
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const subRegex = /^(?:[^.]+\.)?([^.]+\.[^/]+.*$)/i;
    const currentDomain = getDomainFromUrl(currentTab.url).replace(subRegex, "$1");

    chrome.storage.local.get('trackedDomains', (data) => {
        const trackedDomains = data.trackedDomains || [];
        const titleElem = document.getElementById('hostname');

        const spanElem = document.createElement("span");

        spanElem.textContent = `${currentDomain}`;
        titleElem.innerHTML = "";
        titleElem.appendChild(spanElem);

        if (currentDomain.replace(subRegex, "$1") in trackedDomains) {
            const tabs = document.getElementById('tabs');
            tabs.style.display = "block";
            showTrackEpButton(currentDomain, currentTab.id, currentTab.url, currentTab.title);
            displayEpisodes(currentDomain, currentTab.url);
        } else {
            showTrackButton(currentDomain);
        }
    });
});