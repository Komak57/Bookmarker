//import levenshtein from 'fast-levenshtein';
function levenshtein(s, t) {
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

class JIKAN_Manga extends APIClass {
    constructor() {
        super();
        this.throttle = 'jikan';
        // 60 per minute, 1 call per request, pad for [manga,manga,anime]
        this.delay = 1000;
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

        let lowest = this.getMatchScore(details.title, retA.json.data[0].title);
        let m = 0;
        // Cycle all 10 results for a best match
        for (let i = 0; i < retA.json.data.length; i++) {
            const score = this.getMatchScore(details.title, retA.json.data[i].title);
            if (score < lowest) {
                lowest = score;
                m = i;
            }
        }
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