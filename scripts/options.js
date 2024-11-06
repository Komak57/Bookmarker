// Function to load domain settings into options.html
function loadDomainSettings() {
    const domainList = document.getElementById('domainList');
    domainList.innerHTML = ''; // Clear any existing content

    // const trackedDomains = getDomains();
    getDomains().then((trackedDomains) => {
        // Loop through each domain and create the settings form
        Object.keys(trackedDomains).forEach(domain => {
            const settings = trackedDomains[domain];

            // Create container for domain header
            const _header = document.createElement('div');
            _header.classList.add('domain-header');

            const _title = document.createElement('div');
            _title.classList.add('domain-title');
            _title.innerHTML = domain;
            _header.appendChild(_title);

            const _delete = document.createElement('button');
            _delete.textContent = 'Delete Domain';
            _delete.addEventListener('click', (event) => {
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
            _header.appendChild(_delete);

            // Create container for domain header
            const _settings = document.createElement('div');
            _settings.classList.add('domain-settings');

            const _groupMain = document.createElement('div');
            _groupMain.classList.add('settings-group');

            // ====================================
            // Add Media Type select
            // ====================================
            const _mediaTypeLabel = document.createElement('label');
            _mediaTypeLabel.textContent = "Media Type:";
            _groupMain.appendChild(_mediaTypeLabel);
            const _mediaTypeSelect = document.createElement('select');

            for (i = 0; i < categories.length; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = categories[i];
                if (settings.c == i) opt.selected = true;
                _mediaTypeSelect.appendChild(opt);
            }
            _groupMain.appendChild(_mediaTypeSelect);

            // ====================================
            // Add Sort By select
            // ====================================
            const _sortByLabel = document.createElement('label');
            _sortByLabel.textContent = "Sort By:";
            _groupMain.appendChild(_sortByLabel);
            const _sortBySelect = document.createElement('select');

            for (i = 0; i < sortBy.length; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = sortBy[i];
                if (settings.s == i) opt.selected = true;
                _sortBySelect.appendChild(opt);
            };
            _groupMain.appendChild(_sortBySelect);
            _settings.appendChild(_groupMain);

            const _groupObtain = document.createElement('div');
            _groupObtain.classList.add('settings-group');

            const _groupTitlePair = document.createElement('div');
            _groupTitlePair.classList.add('settings-pair');
            // ====================================
            // Create "Obtain Title From" dropdown
            // ====================================
            const _obtainTitleFromLabel = document.createElement('label');
            _obtainTitleFromLabel.textContent = 'Obtain Title From:';
            _groupTitlePair.appendChild(_obtainTitleFromLabel);

            const _obtainTitleFromSelect = document.createElement('select');
            for (i = 0; i < fromOptions.length; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = fromOptions[i];
                if (settings.ot == i) opt.selected = true;
                _obtainTitleFromSelect.appendChild(opt);
            }
            _obtainTitleFromSelect.addEventListener('change', () => {
                updateDomainSetting(trackedDomains, domain, 'ot', parseInt(_obtainTitleFromSelect.value))
                if (settings.ot == 2) {
                    queryTitleMatchLabel.style.display = 'block';
                    queryTitleMatchTextarea.style.display = 'block';
                } else {
                    queryTitleMatchLabel.style.display = 'none';
                    queryTitleMatchTextarea.style.display = 'none';
                }
            });
            _groupTitlePair.appendChild(_obtainTitleFromSelect);

            const queryTitleMatchLabel = document.createElement('label');
            queryTitleMatchLabel.textContent = 'Query Title (CSS Selector or Regex):';
            _groupTitlePair.appendChild(queryTitleMatchLabel);

            const queryTitleMatchTextarea = document.createElement('textarea');
            queryTitleMatchTextarea.value = settings.otm; // Load existing query or leave blank
            queryTitleMatchTextarea.addEventListener('input', () => updateDomainSetting(trackedDomains, domain, 'otm', queryTitleMatchTextarea.value));
            if (settings.ot == 2) {
                queryTitleMatchLabel.style.display = 'block';
                queryTitleMatchTextarea.style.display = 'block';
            } else {
                queryTitleMatchLabel.style.display = 'none';
                queryTitleMatchTextarea.style.display = 'none';
            }
            _groupTitlePair.appendChild(queryTitleMatchTextarea);
            _groupObtain.appendChild(_groupTitlePair);

            const _groupSeasonPair = document.createElement('div');
            _groupSeasonPair.classList.add('settings-pair');

            // ====================================
            // Create "Obtain Season From" dropdown
            // ====================================
            const _obtainSeasonFromLabel = document.createElement('label');
            _obtainSeasonFromLabel.textContent = 'Obtain Season From:';
            _groupSeasonPair.appendChild(_obtainSeasonFromLabel);

            const _obtainSeasonFromSelect = document.createElement('select');
            for (i = 0; i < fromOptions.length; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = fromOptions[i];
                if (settings.os == i) opt.selected = true;
                _obtainSeasonFromSelect.appendChild(opt);
            }
            _obtainSeasonFromSelect.addEventListener('change', () => {
                updateDomainSetting(trackedDomains, domain, 'ot', parseInt(_obtainSeasonFromSelect.value))
                if (settings.os == 2) {
                    querySeasonMatchLabel.style.display = 'block';
                    querySeasonMatchTextarea.style.display = 'block';
                } else {
                    querySeasonMatchLabel.style.display = 'none';
                    querySeasonMatchTextarea.style.display = 'none';
                }
            });
            _groupSeasonPair.appendChild(_obtainSeasonFromSelect);

            const querySeasonMatchLabel = document.createElement('label');
            querySeasonMatchLabel.textContent = 'Query Session (CSS Selector or Regex):';
            _groupSeasonPair.appendChild(querySeasonMatchLabel);

            const querySeasonMatchTextarea = document.createElement('textarea');
            querySeasonMatchTextarea.value = settings.osm; // Load existing query or leave blank
            querySeasonMatchTextarea.addEventListener('input', () => updateDomainSetting(trackedDomains, domain, 'osm', querySeasonMatchTextarea.value));
            if (settings.os == 2) {
                querySeasonMatchLabel.style.display = 'block';
                querySeasonMatchTextarea.style.display = 'block';
            } else {
                querySeasonMatchLabel.style.display = 'none';
                querySeasonMatchTextarea.style.display = 'none';
            }
            _groupSeasonPair.appendChild(querySeasonMatchTextarea);
            _groupObtain.appendChild(_groupSeasonPair);

            const _groupEpisodePair = document.createElement('div');
            _groupEpisodePair.classList.add('settings-pair');

            // ====================================
            // Create "Obtain Episode From" dropdown
            // ====================================
            const _obtainEpisodeFromLabel = document.createElement('label');
            _obtainEpisodeFromLabel.textContent = 'Obtain Episode From:';
            _groupEpisodePair.appendChild(_obtainEpisodeFromLabel);

            const _obtainEpisodeFromSelect = document.createElement('select');
            for (i = 0; i < fromOptions.length; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = fromOptions[i];
                if (settings.oe == i) opt.selected = true;
                _obtainEpisodeFromSelect.appendChild(opt);
            }
            _obtainEpisodeFromSelect.addEventListener('change', () => {
                updateDomainSetting(trackedDomains, domain, 'ot', parseInt(_obtainEpisodeFromSelect.value))
                if (settings.oe == 2) {
                    queryEpisodeMatchLabel.style.display = 'block';
                    queryEpisodeMatchTextarea.style.display = 'block';
                } else {
                    queryEpisodeMatchLabel.style.display = 'none';
                    queryEpisodeMatchTextarea.style.display = 'none';
                }
            });
            _groupEpisodePair.appendChild(_obtainEpisodeFromSelect);

            const queryEpisodeMatchLabel = document.createElement('label');
            queryEpisodeMatchLabel.textContent = 'Query Episode (CSS Selector or Regex):';
            _groupEpisodePair.appendChild(queryEpisodeMatchLabel);

            const queryEpisodeMatchTextarea = document.createElement('textarea');
            queryEpisodeMatchTextarea.value = settings.oem; // Load existing query or leave blank
            queryEpisodeMatchTextarea.addEventListener('input', () => updateDomainSetting(trackedDomains, domain, 'oem', queryEpisodeMatchTextarea.value));
            if (settings.oe == 2) {
                queryEpisodeMatchLabel.style.display = 'block';
                queryEpisodeMatchTextarea.style.display = 'block';
            } else {
                queryEpisodeMatchLabel.style.display = 'none';
                queryEpisodeMatchTextarea.style.display = 'none';
            }
            _groupEpisodePair.appendChild(queryEpisodeMatchTextarea);
            _groupObtain.appendChild(_groupEpisodePair);
            _settings.appendChild(_groupObtain);

            // ====================================
            // Create "Extra" options
            // ====================================
            const _groupExtras = document.createElement('div');
            _groupExtras.classList.add('settings-group');

            // Create "Ignore Episode Match" checkbox
            const _ignoreEpisodeLabel = document.createElement('label');
            _ignoreEpisodeLabel.textContent = 'Ignore Episode Match:';
            _groupExtras.appendChild(_ignoreEpisodeLabel);

            const _ignoreEpisodeCheckbox = document.createElement('input');
            _ignoreEpisodeCheckbox.type = 'checkbox';
            _ignoreEpisodeCheckbox.checked = settings.ie;
            _ignoreEpisodeCheckbox.addEventListener('change', () => updateDomainSetting(trackedDomains, domain, 'ie', _ignoreEpisodeCheckbox.checked));
            _groupExtras.appendChild(_ignoreEpisodeCheckbox);

            // Create "Notify on Episode Skip" checkbox
            const _notifyLabel = document.createElement('label');
            _notifyLabel.textContent = 'Notify on Episode Skip:';
            _groupExtras.appendChild(_notifyLabel);

            const _notifyCheckbox = document.createElement('input');
            _notifyCheckbox.type = 'checkbox';
            _notifyCheckbox.checked = settings.n;
            _notifyCheckbox.addEventListener('change', () => updateDomainSetting(trackedDomains, domain, 'n', _notifyCheckbox.checked));
            _groupExtras.appendChild(_notifyCheckbox);
            _settings.appendChild(_groupExtras);

            // Add "Move To" domain transfer functionality
            const _moveToLabel = document.createElement('label');
            _moveToLabel.textContent = 'Move Episodes To:';
            _settings.appendChild(_moveToLabel);

            const _moveToSelect = document.createElement('select');
            _moveToSelect.innerHTML = `<option value="">Select Domain</option>`;
            Object.keys(trackedDomains).forEach(otherDomain => {
                if (otherDomain !== domain) {
                    const opt = document.createElement('option');
                    opt.value = otherDomain;
                    opt.textContent = otherDomain;
                    _moveToSelect.appendChild(opt);
                }
            });
            // moveToSelect.addEventListener('change', () => moveEpisodes(trackedDomains, domain, moveToSelect.value));
            _settings.appendChild(_moveToSelect);

            // ====================================
            // Create "Move All" options
            // ====================================
            const _moveToButton = document.createElement('button');
            _moveToButton.textContent = 'Move All';
            _moveToButton.addEventListener('click', (event) => {
                event.stopPropagation();
                event.preventDefault();

                moveEpisodes(trackedDomains, domain, _moveToSelect.value);
                window.location.reload();
            });
            _settings.appendChild(_moveToButton);

            _header.addEventListener('click', (event) => {
                _settings.style.display = _settings.style.display === 'block' ? 'none' : 'block';
            });
            // Add the header to the page.
            domainList.appendChild(_header);

            // Add the settings to the page.
            domainList.appendChild(_settings);
            // const _groupObtain = document.createElement('div');
            // _settings.classList.add('settings-group');

            // const _groupExtra = document.createElement('div');
            // _settings.classList.add('settings-group');


            // // Add domain title
            // const domainTitle = document.createElement('h3');
            // domainTitle.textContent = domain;
            // domainDiv.appendChild(domainTitle);

            // const settingsDiv = document.createElement('div');
            // settingsDiv.classList.add('domain-settings'); {
            //     // Create "Category" dropdown
            //     const mediaType = document.createElement('label');
            //     mediaType.textContent = 'Media Type:';
            //     const mediaTypeSelect = document.createElement('select');
            //     for (i = 0; i < categories.length; i++) {
            //         const opt = document.createElement('option');
            //         opt.value = i;
            //         opt.textContent = categories[i];
            //         if (settings.c == i) opt.selected = true;
            //         mediaTypeSelect.appendChild(opt);
            //     }
            //     mediaTypeSelect.addEventListener('change', () => updateDomainSetting(trackedDomains, domain, 'c', parseInt(mediaTypeSelect.value)));
            //     settingsDiv.appendChild(mediaType);
            //     settingsDiv.appendChild(mediaTypeSelect);
            // }

            // // Create "Sort By" dropdown
            // const sortByLabel = document.createElement('label');
            // sortByLabel.textContent = 'Sort By:';
            // const sortBySelect = document.createElement('select');
            // for (i = 0; i < sortBy.length; i++) {
            //     const opt = document.createElement('option');
            //     opt.value = i;
            //     opt.textContent = sortBy[i];
            //     if (settings.s == i) opt.selected = true;
            //     sortBySelect.appendChild(opt);
            // };
            // sortBySelect.addEventListener('change', () => updateDomainSetting(trackedDomains, domain, 's', parseInt(sortBySelect.value)));
            // settingsDiv.appendChild(sortByLabel);
            // settingsDiv.appendChild(sortBySelect);

            // {
            //     // Create "Obtain Title From" dropdown
            //     const titleFromLabel = document.createElement('label');
            //     titleFromLabel.textContent = 'Obtain Title From:';
            //     const titleFromSelect = document.createElement('select');
            //     for (i = 0; i < fromOptions.length; i++) {
            //         const opt = document.createElement('option');
            //         opt.value = i;
            //         opt.textContent = fromOptions[i];
            //         if (settings.ot == i) opt.selected = true;
            //         titleFromSelect.appendChild(opt);
            //     }
            //     titleFromSelect.addEventListener('change', () => updateDomainSetting(trackedDomains, domain, 'ot', parseInt(titleFromSelect.value)));
            //     settingsDiv.appendChild(titleFromLabel);
            //     settingsDiv.appendChild(titleFromSelect);
            // } {
            //     // Create "Obtain Season From" dropdown
            //     const seasonFromLabel = document.createElement('label');
            //     seasonFromLabel.textContent = 'Obtain Season From:';
            //     const seasonFromSelect = document.createElement('select');
            //     for (i = 0; i < fromOptions.length; i++) {
            //         const opt = document.createElement('option');
            //         opt.value = i;
            //         opt.textContent = fromOptions[i];
            //         if (settings.os == i) opt.selected = true;
            //         seasonFromSelect.appendChild(opt);
            //     }
            //     seasonFromSelect.addEventListener('change', () => updateDomainSetting(trackedDomains, domain, 'os', parseInt(seasonFromSelect.value)));
            //     settingsDiv.appendChild(seasonFromLabel);
            //     settingsDiv.appendChild(seasonFromSelect);
            // } {
            //     // Create "Obtain Episode From" dropdown
            //     const episodeFromLabel = document.createElement('label');
            //     episodeFromLabel.textContent = 'Obtain Episode From:';
            //     const episodeFromSelect = document.createElement('select');
            //     for (i = 0; i < fromOptions.length; i++) {
            //         const opt = document.createElement('option');
            //         opt.value = i;
            //         opt.textContent = fromOptions[i];
            //         if (settings.oe == i) opt.selected = true;
            //         episodeFromSelect.appendChild(opt);
            //     }
            //     episodeFromSelect.addEventListener('change', () => updateDomainSetting(trackedDomains, domain, 'oe', parseInt(episodeFromSelect.value)));
            //     settingsDiv.appendChild(episodeFromLabel);
            //     settingsDiv.appendChild(episodeFromSelect);
            // }
            // Create "Ignore Episode Match" checkbox
            // const ignoreEpisodeMatchLabel = document.createElement('label');
            // ignoreEpisodeMatchLabel.textContent = 'Ignore Episode Match:';
            // const ignoreEpisodeMatchCheckbox = document.createElement('input');
            // ignoreEpisodeMatchCheckbox.type = 'checkbox';
            // ignoreEpisodeMatchCheckbox.checked = settings.ie;
            // ignoreEpisodeMatchCheckbox.addEventListener('change', () => updateDomainSetting(trackedDomains, domain, 'ie', ignoreEpisodeMatchCheckbox.checked));
            // settingsDiv.appendChild(ignoreEpisodeMatchLabel);
            // settingsDiv.appendChild(ignoreEpisodeMatchCheckbox);

            // // Create "Notify on Episode Skip" checkbox
            // const notifySkipLabel = document.createElement('label');
            // notifySkipLabel.textContent = 'Notify on Episode Skip:';
            // const notifySkipCheckbox = document.createElement('input');
            // notifySkipCheckbox.type = 'checkbox';
            // notifySkipCheckbox.checked = settings.n;
            // notifySkipCheckbox.addEventListener('change', () => updateDomainSetting(trackedDomains, domain, 'n', notifySkipCheckbox.checked));
            // settingsDiv.appendChild(notifySkipLabel);
            // settingsDiv.appendChild(notifySkipCheckbox);

            // Add "Move To" domain transfer functionality
            // const moveToLabel = document.createElement('label');
            // moveToLabel.textContent = 'Move Episodes To:';
            // const moveToSelect = document.createElement('select');
            // moveToSelect.innerHTML = `<option value="">Select Domain</option>`;
            // Object.keys(trackedDomains).forEach(otherDomain => {
            //     if (otherDomain !== domain) {
            //         const opt = document.createElement('option');
            //         opt.value = otherDomain;
            //         opt.textContent = otherDomain;
            //         moveToSelect.appendChild(opt);
            //     }
            // });
            // // moveToSelect.addEventListener('change', () => moveEpisodes(trackedDomains, domain, moveToSelect.value));
            // settingsDiv.appendChild(moveToLabel);
            // settingsDiv.appendChild(moveToSelect);

            // const transferButton = document.createElement('button');
            // transferButton.textContent = 'Move All';
            // transferButton.addEventListener('click', (event) => {
            //     event.stopPropagation();
            //     event.preventDefault();

            //     moveEpisodes(trackedDomains, domain, moveToSelect.value);
            //     window.location.reload();
            // });
            // settingsDiv.appendChild(transferButton);

            // const removeButton = document.createElement('button');
            // settingsDiv.appendChild(removeButton);

            // domainDiv.appendChild(settingsDiv);

            // const extraDiv = document.createElement('div');
            // extraDiv.classList.add('domain-settings');

            // if (settings.ot == 2) {
            //     // Add "HTML Query Match" input
            //     const queryMatchLabel = document.createElement('label');
            //     queryMatchLabel.textContent = 'Query Title (CSS Selector or Regex):';
            //     const queryMatchTextarea = document.createElement('textarea');
            //     queryMatchTextarea.value = settings.otm; // Load existing query or leave blank
            //     queryMatchTextarea.addEventListener('input', () => updateDomainSetting(trackedDomains, domain, 'otm', queryMatchTextarea.value));
            //     extraDiv.appendChild(queryMatchLabel);
            //     extraDiv.appendChild(queryMatchTextarea);
            // }
            // if (settings.os == 2) {
            //     // Add "HTML Query Match" input
            //     const queryMatchLabel = document.createElement('label');
            //     queryMatchLabel.textContent = 'Query Session (CSS Selector or Regex):';
            //     const queryMatchTextarea = document.createElement('textarea');
            //     queryMatchTextarea.value = settings.osm; // Load existing query or leave blank
            //     queryMatchTextarea.addEventListener('input', () => updateDomainSetting(trackedDomains, domain, 'osm', queryMatchTextarea.value));
            //     extraDiv.appendChild(queryMatchLabel);
            //     extraDiv.appendChild(queryMatchTextarea);
            // }
            // if (settings.oe == 2) {
            //     // Add "HTML Query Match" input
            //     const queryMatchLabel = document.createElement('label');
            //     queryMatchLabel.textContent = 'Query Episode (CSS Selector or Regex):';
            //     const queryMatchTextarea = document.createElement('textarea');
            //     queryMatchTextarea.value = settings.oem; // Load existing query or leave blank
            //     queryMatchTextarea.addEventListener('input', () => updateDomainSetting(trackedDomains, domain, 'oem', queryMatchTextarea.value));
            //     extraDiv.appendChild(queryMatchLabel);
            //     extraDiv.appendChild(queryMatchTextarea);
            // }
            // if (extraDiv.children.length > 0) {
            //     domainDiv.appendChild(extraDiv);
            // }

            // domainList.appendChild(domainDiv);

        });
    });
}

// // Script to toggle display of settings for each domain
// document.querySelectorAll('.domain-header').forEach(title => {
//     title.addEventListener('click', () => {
//         const settings = title.nextElementSibling;
//         settings.style.display = settings.style.display === 'block' ? 'none' : 'block';
//     });
// });
// // Stop the click event from propagating to the parent container when clicking the delete button
// document.querySelectorAll('.delete-button').forEach(button => {
//     button.addEventListener('click', (event) => {
//         event.stopPropagation(); // Prevents triggering the container toggle event
//         const domainName = button.previousElementSibling.textContent;
//         console.log(`Deleting domain: ${domainName}`);

//         // Add delete logic here
//     });
// });
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
            // window.location.reload();
    }
    //
}

// Function to move episodes to another domain
function moveEpisodes(Domains, fromDomain, toDomain) {
    // Get Domain ID's
    if (fromDomain && toDomain) {
        // Logic to transfer episodes between domains
        const fID = Domains[fromDomain].i;
        const tID = Domains[toDomain].i;
        console.log(`Moving episodes from ${fromDomain}(${fID}) to ${toDomain}(${tID})`);
        // You can implement logic here to update the stored data and transfer the episodes
        getEpisodes()
            .then((episodes) => {
                for (let id in episodes) {
                    if (episodes[id].d == fID) {
                        episodes[id].d = tID; // Transfer domain control
                        // episodes[id].c = Domains[toDomain].c; // Transfer category
                    }
                }
                console.log(`Episodes in ${fromDomain} after transfer:`, Object.fromEntries(Object.entries(episodes).filter(([id, ep]) => ep.d === Domains[fromDomain].i)));
                console.log(`Episodes in ${toDomain} after transfer:`, Object.fromEntries(Object.entries(episodes).filter(([id, ep]) => ep.d === Domains[toDomain].i)));
                saveEpisodes(episodes);
            });
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