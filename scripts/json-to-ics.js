const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const {slugify} = require("./slugify");

const ROOT_DIR = path.resolve(__dirname, '../');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const LOCATION_MAPPER_PATH = path.resolve(ROOT_DIR, 'location_mapper.json');
const TEAMS_FILE_PATH = path.resolve(ROOT_DIR, 'teams.json');


/**
 * Asynchronously loads a specified JSON file.
 * @param {string} file_path - The path to the .json file.
 * @returns {Promise<Array<object>>} The array of objects from the JSON.
 */
const load_json_file_async = async (file_path) => {
    const file_content = await fs.readFile(file_path, 'utf8');
    return JSON.parse(file_content);
};

const load_location_mapper_async = async (file_path) => {
    try {
        await fs.access(file_path);
        const file_content = await fs.readFile(file_path, 'utf8');
        return JSON.parse(file_content);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`Warning: Location mapper file not found at ${file_path}. Using default venues.`);
        } else {
            console.error(`Error loading location mapper: ${error.message}`);
        }
        return {};
    }
};

const load_teams_async = async (file_path) => {
    try {
        const file_content = await fs.readFile(file_path, 'utf8');
        return JSON.parse(file_content);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ Error: Could not find ${file_path}`);
        } else if (error instanceof SyntaxError) {
            console.error(`❌ Error: Failed to parse ${file_path}. Check for JSON syntax errors.`);
        } else {
            console.error(`❌ Error reading teams file: ${error.message}`);
        }
        throw new Error('Failed to load teams file.');
    }
};

const save_ical_file_async = async (file_path, ical_data) => {
    const dir_path = path.dirname(file_path);
    await fs.mkdir(dir_path, { recursive: true });
    await fs.writeFile(file_path, ical_data, 'utf8');
};

const parse_utc_date = (date_str, time_str) => {
    const date_parts = date_str.split('/');
    const time_parts = time_str.split(':');
    if (date_parts.length !== 3 || time_parts.length !== 2) {
        return null;
    }
    const day = parseInt(date_parts[0], 10);
    const month = parseInt(date_parts[1], 10) - 1;
    const year = parseInt(date_parts[2], 10) + 2000;
    const hour = parseInt(time_parts[0], 10);
    const minute = parseInt(time_parts[1], 10);
    return new Date(Date.UTC(year, month, day, hour, minute));
};

const format_date_for_ical = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

/**
 * Converts an array of fixtures AND results into a single iCal string.
 * @param {Array<object>} events - The combined array of fixtures and results.
 *-----
 * @param {object} location_mapper - The location mapper object.
 * @param {string} team_url - // --- CHANGED --- Added team_url parameter
 * @returns {string}
 */
const convert_events_to_ical = (events, location_mapper, team_url) => { // --- CHANGED ---
    if (events.length === 0) {
        console.warn('No fixtures or results found in the JSON. An empty calendar file will be created.');
    }
    const crlf = '\r\n';
    const dtstamp = format_date_for_ical(new Date());
    const ical_lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//CraigWayne//PoolFixtures v1.0//EN',
        'CALSCALE:GREGORIAN',
    ];

    for (const event of events) {
        const start_date = parse_utc_date(event.date, event.time);
        if (!start_date) {
            console.warn(`Skipping event with invalid date/time: ${event.date}`);
            continue;
        }
        const end_date = new Date(start_date.getTime());
        end_date.setUTCHours(end_date.getUTCHours() + 2); // Assume 2-hour duration

        const dtstart_formatted = format_date_for_ical(start_date);
        const dtend_formatted = format_date_for_ical(end_date);

        let summary = '';
        if (event.result) {
            summary = `${event.home_team} ${event.result} ${event.away_team}`;
        } else {
            summary = `${event.home_team} vs ${event.away_team}`;
        }

        let location = location_mapper[event.venue.toLowerCase()] || event.venue;

        const uid = uuidv4();
        ical_lines.push(
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `SUMMARY:${summary}`,
            `LOCATION:${location}`,
            `DESCRIPTION:${team_url}`, // --- CHANGED --- Added DESCRIPTION line
            `DTSTAMP:${dtstamp}`,
            `DTSTART:${dtstart_formatted}`,
            `DTEND:${dtend_formatted}`,
            'END:VEVENT'
        );
    }
    ical_lines.push('END:VCALENDAR');
    return ical_lines.join(crlf);
};

/**
 * Main async function to run the JSON -> iCal build process.
 */
const main = async () => {
    try {
        console.log('Starting JSON-to-iCal build process...');

        const location_mapper = await load_location_mapper_async(LOCATION_MAPPER_PATH);
        const teams = await load_teams_async(TEAMS_FILE_PATH);

        if (!Array.isArray(teams) || teams.length === 0) {
            console.warn('⚠️ teams.json is empty or invalid. Nothing to process.');
            return;
        }

        console.log(`Found ${teams.length} team(s) to process...`);

        for (const team of teams) {
            if (!team || !team.name || !team.url) { // --- CHANGED --- Also check for team.url
                console.warn('⚠️ Skipping invalid team entry in teams.json (missing name or url):', team);
                continue;
            }

            const team_slug = slugify(team.name);

            const json_file_name_fixtures = `fixtures-${team_slug}.json`;
            const json_file_path_fixtures = path.join(DIST_DIR, json_file_name_fixtures);

            const json_file_name_results = `results-${team_slug}.json`;
            const json_file_path_results = path.join(DIST_DIR, json_file_name_results);

            const ics_file_name = `${team_slug}.ics`;
            const ics_output_path = path.join(DIST_DIR, ics_file_name);

            console.log(`--- Processing ${team.name} ---`);

            let fixtures = [];
            let results = [];

            try {
                fixtures = await load_json_file_async(json_file_path_fixtures);

                try {
                    results = await load_json_file_async(json_file_path_results);
                } catch (results_error) {
                    if (results_error.code === 'ENOENT') {
                        console.log(`   -> No results file found for ${team.name}, skipping.`);
                    } else {
                        throw results_error; // A real error occurred
                    }
                }

                const all_events = [...fixtures, ...results];
                console.log(`Found ${fixtures.length} fixtures and ${results.length} results. Converting to iCal...`);

                // --- CHANGED --- Pass team.url to the function
                const ical_string = convert_events_to_ical(all_events, location_mapper, team.url);

                await save_ical_file_async(ics_output_path, ical_string);
                console.log(`✅ Successfully created iCal file for ${team.name} at ${ics_output_path}`);

            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.error(`❌ Error for ${team.name}: Fixtures JSON file not found at ${json_file_path_fixtures}.`);
                    console.log(`   -> Did you run 'node scripts/html-to-json-fixtures.js' first?`);
                } else {
                    console.error(`❌ An error occurred processing ${team.name}:`, error.message);
                }
            }
        }
        console.log('🎉 All iCal generation operations finished.');
    } catch (error)
    {
        console.error(`❌ A critical error occurred:`, error.message);
        process.exit(1);
    }
};

main();
