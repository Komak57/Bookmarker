class JIKAN_Manga extends APIClass {
    constructor() {
        super();
        this.throttle = 'jikan';
        // 60 per minute, 1 call per request, pad for [manga,manga,anime]
        this.delay = 1000;
    }

    static {
        this.alias = 'JIKAN Manga';
        APIClass.register(this.alias, new JIKAN_Manga());
    }

    // ====================================
    // JIKAN API - Get Manga Data
    // ====================================
    async fetch(details, tab, settings) {
        // Get title from API - https://api.jikan.moe/v4/manga?q=
        const retA = await this.fetchData(details);
        // .then(ret => {
        if (!retA.json.data[0]) {
            log('error', `JIKAN Data[0] not Found searching ${tab.url}`);
            return;
        }

        let lowest = this.levenshtein(details.title.toLowerCase(), retA.json.data[0].title.toLowerCase());
        let m = 0;
        // Cycle all 10 results for a best match
        for (let i = 0; i < retA.json.data.length; i++) {
            const score = this.levenshtein(details.title.toLowerCase(), retA.json.data[i].title.toLowerCase());
            if (score < lowest) {
                lowest = score;
                m = i;
            }
        }
        log('log', `JIKAN ${retA.json.data.length} series. `, retA.json.data);
        log('log', `JIKAN Best match was ${retA.json.data[m].title} with a score of ${lowest}`);
        const jikan = new DataStruct(
            retA.json.data[m].mal_id, // id
            settings.c, // c
            settings.i, // d
            0, // f
            details.title, // t
            details.episode, // e
            retA.json.data[m].chapters, // r
            retA.json.data[m].chapters, // n
            retA.json.data[m].images.jpg.small_image_url, // p
            "tab.url", // l
            Date.now() // u
        );
        // Try to get Title from Jikan.
        // NOTE: It can be in an array called "Titles", or as a collection of objects called "title(_language?)"
        const titles = retA.json.data[m].titles;
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
            if (retA.json.data[m].title) // default
                jikan.t = retA.json.data[m].title;
            if (retA.json.data[m].title_english) // english
                jikan.t = retA.json.data[m].title_english;
        }
        return jikan;
        // })
        // .catch(error => log('error', `JIKAN Error: ${error}`));
    }
    async fetchData(details) {
        const url = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(details.title)}&limit=10`;
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