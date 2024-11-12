class JIKAN_Manga extends APIClass {
    constructor() {
        super();
        this.throttle = 'jikan';
        // 60 per minute, 1 call per request, pad for [manga,manga,anime]
        this.delay = 1500;
    }

    // ====================================
    // JIKAN API - Get Manga Data
    // ====================================
    fetch(details, tab, settings) {
        // Get title from API - https://api.jikan.moe/v4/manga?q=
        this.fetchData(details)
            .then(ret => {
                if (!ret.json.data[0]) {
                    log('error', `JIKAN Data[0] not Found searching ${tab.url}`);
                    return;
                }
                const jikan = new DataStruct(
                    retA.json.data[0].mal_id, // id
                    settings.c, // c
                    settings.i, // d
                    0, // f
                    details.title, // t
                    details.episode, // e
                    retEp.json.data.length, // r
                    retA.json.data[0].chapters, // n
                    retA.json.data[0].images.jpg.small_image_url, // p
                    "tab.url", // l
                    Date.now() // u
                );
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
                    log('log', `JIKAN Success: ${jikan.id} / ${jikan.t}`);
                } else {
                    if (ret.json.data[0].title) // default
                        jikan.t = ret.json.data[0].title;
                    if (ret.json.data[0].title_english) // english
                        jikan.t = ret.json.data[0].title_english;
                }
                return jikan;
            })
            .catch(error => log('error', `JIKAN Error: ${error}`));
    }
    async fetchData(details) {
        const url = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(details.title)}&limit=1`;
        log('log', `Attempting JIKAN API: ${url}`);

        try {
            const response = await fetch(url); // Await the fetch response
            log('log', 'Response status:', response.status); // Should log the status code

            if (response.ok) { // Checks if status is in the range 200-299
                const json = await response.json(); // Parse JSON if response is successful
                log('log', `JIKAN: Data Retrieved`);
                return { data: details, json: json };
            } else {
                log('error', `Bad response from JIKAN: ${response.status}`);
                return { data: details, json: null };
            }
        } catch (error) {
            log('error', 'Fetch error:', error); // Handle network errors
            return { data: details, json: null };
        }
    }
}