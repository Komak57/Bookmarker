// Function to load domain settings into options.html
function loadDomainSettings() {
    const domainList = document.getElementById('domainList');
    domainList.innerHTML = ''; // Clear any existing content

    // const trackedDomains = getDomains();
    getDomains().then((trackedDomains) => {
        // Loop through each domain and create the settings form
        Object.keys(trackedDomains).forEach(domain => {
            const settings = trackedDomains[domain];

            // Create container for domain settings
            const domainDiv = document.createElement('div');
            domainDiv.classList.add('domain-title');

            // Add domain title
            const domainTitle = document.createElement('h3');
            domainTitle.textContent = domain;
            domainDiv.appendChild(domainTitle);

            const settingsDiv = document.createElement('div');
            settingsDiv.classList.add('domain-settings'); {
                // Create "Obtain Title From" dropdown
                const titleFromLabel = document.createElement('label');
                titleFromLabel.textContent = 'Obtain Title From:';
                const titleFromSelect = document.createElement('select');
                for (i = 0; i < fromOptions.length; i++) {
                    const opt = document.createElement('option');
                    opt.value = i;
                    opt.textContent = fromOptions[i];
                    if (settings.ot == i) opt.selected = true;
                    titleFromSelect.appendChild(opt);
                }
                titleFromSelect.addEventListener('change', () => updateDomainSetting(trackedDomains, domain, 'ot', parseInt(titleFromSelect.value)));
                settingsDiv.appendChild(titleFromLabel);
                settingsDiv.appendChild(titleFromSelect);
            } {
                // Create "Obtain Season From" dropdown
                const seasonFromLabel = document.createElement('label');
                seasonFromLabel.textContent = 'Obtain Season From:';
                const seasonFromSelect = document.createElement('select');
                for (i = 0; i < fromOptions.length; i++) {
                    const opt = document.createElement('option');
                    opt.value = i;
                    opt.textContent = fromOptions[i];
                    if (settings.os == i) opt.selected = true;
                    seasonFromSelect.appendChild(opt);
                }
                seasonFromSelect.addEventListener('change', () => updateDomainSetting(trackedDomains, domain, 'os', parseInt(seasonFromSelect.value)));
                settingsDiv.appendChild(seasonFromLabel);
                settingsDiv.appendChild(seasonFromSelect);
            } {
                // Create "Obtain Episode From" dropdown
                const episodeFromLabel = document.createElement('label');
                episodeFromLabel.textContent = 'Obtain Episode From:';
                const episodeFromSelect = document.createElement('select');
                for (i = 0; i < fromOptions.length; i++) {
                    const opt = document.createElement('option');
                    opt.value = i;
                    opt.textContent = fromOptions[i];
                    if (settings.oe == i) opt.selected = true;
                    episodeFromSelect.appendChild(opt);
                }
                episodeFromSelect.addEventListener('change', () => updateDomainSetting(trackedDomains, domain, 'oe', parseInt(episodeFromSelect.value)));
                settingsDiv.appendChild(episodeFromLabel);
                settingsDiv.appendChild(episodeFromSelect);
            }
            // Create "Ignore Episode Match" checkbox
            const ignoreEpisodeMatchLabel = document.createElement('label');
            ignoreEpisodeMatchLabel.textContent = 'Ignore Episode Match:';
            const ignoreEpisodeMatchCheckbox = document.createElement('input');
            ignoreEpisodeMatchCheckbox.type = 'checkbox';
            ignoreEpisodeMatchCheckbox.checked = settings.ie;
            ignoreEpisodeMatchCheckbox.addEventListener('change', () => updateDomainSetting(trackedDomains, domain, 'ie', ignoreEpisodeMatchCheckbox.checked));
            settingsDiv.appendChild(ignoreEpisodeMatchLabel);
            settingsDiv.appendChild(ignoreEpisodeMatchCheckbox);

            // Create "Notify on Episode Skip" checkbox
            const notifySkipLabel = document.createElement('label');
            notifySkipLabel.textContent = 'Notify on Episode Skip:';
            const notifySkipCheckbox = document.createElement('input');
            notifySkipCheckbox.type = 'checkbox';
            notifySkipCheckbox.checked = settings.n;
            notifySkipCheckbox.addEventListener('change', () => updateDomainSetting(trackedDomains, domain, 'n', notifySkipCheckbox.checked));
            settingsDiv.appendChild(notifySkipLabel);
            settingsDiv.appendChild(notifySkipCheckbox);

            // Create "Sort By" dropdown
            const sortByLabel = document.createElement('label');
            sortByLabel.textContent = 'Sort By:';
            const sortBySelect = document.createElement('select');
            for (i = 0; i < sortBy.length; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = sortBy[i];
                if (settings.s == i) opt.selected = true;
                sortBySelect.appendChild(opt);
            };
            sortBySelect.addEventListener('change', () => updateDomainSetting(trackedDomains, domain, 's', parseInt(sortBySelect.value)));
            settingsDiv.appendChild(sortByLabel);
            settingsDiv.appendChild(sortBySelect);

            // Add "Move To" domain transfer functionality
            const moveToLabel = document.createElement('label');
            moveToLabel.textContent = 'Move Episodes To:';
            const moveToSelect = document.createElement('select');
            moveToSelect.innerHTML = `<option value="">Select Domain</option>`;
            Object.keys(trackedDomains).forEach(otherDomain => {
                if (otherDomain !== domain) {
                    const opt = document.createElement('option');
                    opt.value = otherDomain;
                    opt.textContent = otherDomain;
                    moveToSelect.appendChild(opt);
                }
            });
            moveToSelect.addEventListener('change', () => moveEpisodes(trackedDomains, domain, moveToSelect.value));
            settingsDiv.appendChild(moveToLabel);
            settingsDiv.appendChild(moveToSelect);

            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.addEventListener('click', (event) => {
                event.stopPropagation();
                event.preventDefault();

                delete trackedDomains[domain];
                saveDomains(trackedDomains);
                window.location.reload();
                // // Remove domain from tracking
                // chrome.storage.local.get('trackedDomains', (data) => {
                //     const trackedDomains = data.trackedDomains || {};
                //     delete trackedDomains[domain];
                //     saveToStorage(trackedDomains);
                // });

                //chrome.storage.local.set({ trackedDomains: domainList }, displayTrackedDomains);
            });
            settingsDiv.appendChild(removeButton);

            domainDiv.appendChild(settingsDiv);

            const extraDiv = document.createElement('div');
            extraDiv.classList.add('domain-settings');

            if (settings.ot == 2) {
                // Add "HTML Query Match" input
                const queryMatchLabel = document.createElement('label');
                queryMatchLabel.textContent = 'Query Title (CSS Selector or Regex):';
                const queryMatchTextarea = document.createElement('textarea');
                queryMatchTextarea.value = settings.otm; // Load existing query or leave blank
                queryMatchTextarea.addEventListener('input', () => updateDomainSetting(trackedDomains, domain, 'otm', queryMatchTextarea.value));
                extraDiv.appendChild(queryMatchLabel);
                extraDiv.appendChild(queryMatchTextarea);
            }
            if (settings.os == 2) {
                // Add "HTML Query Match" input
                const queryMatchLabel = document.createElement('label');
                queryMatchLabel.textContent = 'Query Session (CSS Selector or Regex):';
                const queryMatchTextarea = document.createElement('textarea');
                queryMatchTextarea.value = settings.osm; // Load existing query or leave blank
                queryMatchTextarea.addEventListener('input', () => updateDomainSetting(trackedDomains, domain, 'osm', queryMatchTextarea.value));
                extraDiv.appendChild(queryMatchLabel);
                extraDiv.appendChild(queryMatchTextarea);
            }
            if (settings.oe == 2) {
                // Add "HTML Query Match" input
                const queryMatchLabel = document.createElement('label');
                queryMatchLabel.textContent = 'Query Episode (CSS Selector or Regex):';
                const queryMatchTextarea = document.createElement('textarea');
                queryMatchTextarea.value = settings.oem; // Load existing query or leave blank
                queryMatchTextarea.addEventListener('input', () => updateDomainSetting(trackedDomains, domain, 'oem', queryMatchTextarea.value));
                extraDiv.appendChild(queryMatchLabel);
                extraDiv.appendChild(queryMatchTextarea);
            }
            if (extraDiv.children.length > 0) {
                domainDiv.appendChild(extraDiv);
            }

            domainList.appendChild(domainDiv);

        });
    });
}

// Function to update domain setting
function updateDomainSetting(trackedDomains, domain, settingKey, newValue) {
    console.log(`Updating ${settingKey} to ${newValue}`);
    if (trackedDomains[domain]) {
        trackedDomains[domain][settingKey] = newValue;
        saveDomains(trackedDomains);
        // saveToStorage(trackedDomains);
    }
    switch (settingKey) {
        case 'otm':
        case 'osm':
        case 'oem':
            break;
        default:
            window.location.reload();
    }
    //
}

// Function to move episodes to another domain
function moveEpisodes(fromDomain, toDomain) {
    if (fromDomain && toDomain) {
        // Logic to transfer episodes between domains
        console.log(`Moving episodes from ${fromDomain} to ${toDomain}`);
        // You can implement logic here to update the stored data and transfer the episodes
    }
}

// Simulate saving to storage (replace with chrome.storage.sync or local if needed)
// function saveToStorage(trackedDomains) {
//     console.log('Saving domain settings:', trackedDomains);
//     // Implement actual saving logic here using chrome.storage if needed
//     saveDomains(trackedDomains);
//     console.log('Tracked domains updated in storage');
// }
// Load the list of tracked domains when the page loads
document.addEventListener('DOMContentLoaded', loadDomainSettings);