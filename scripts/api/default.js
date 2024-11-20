class InternalAPI extends APIClass {
    constructor() {
        super();
        this.throttle = 'internal';
        this.delay = 0;
    }

    static {
        this.alias = 'Internal';
        APIClass.register(this.alias, new InternalAPI());
    }

    // ====================================
    // JIKAN API - Get Manga Data
    // ====================================
    fetch(details, tab, settings) {
        // TODO: Get title from existing match
        const ep = new DataStruct(
            details.title, // id
            InternalAPI.alias,
            settings.c, // c
            settings.i, // d
            0, // f
            details.title, // t
            details.episode, // e
            details.episode, // r
            details.episode, // n
            "", // p
            "tab.url", // l
            Date.now() // u
        );
        return ep;
    }
}