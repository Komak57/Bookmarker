// Function to get query parameters
function getQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        title: urlParams.get('title'),
        url: urlParams.get('url'),
        tabId: urlParams.get('tabId')
    };
}

// Get the episode URL from query parameters
const { title: episodeTitle, url: episodeUrl, tabId } = getQueryParams();
document.title = episodeTitle;

// Redirect to the episode URL when the button is clicked
document.getElementById('goToEpisode').addEventListener('click', () => {
    log('log', `Returning to ${episodeUrl}`);
    // Tell the active tab to navigate to the episode URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (episodeUrl && tabId) {
            // Redirect our previous tab
            chrome.tabs.update(Number(tabId), { url: episodeUrl });

            // Close the notification window
            chrome.windows.getCurrent((window) => {
                chrome.windows.remove(window.id); // Close the current notification window
            });
        }
    });
});