const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const {slugify} = require("./slugify");

// --- Configuration Paths ---
const DIST_DIR = path.resolve(__dirname, 'dist');
const LOCATION_MAPPER_PATH = path.resolve(__dirname, 'location_mapper.json');
const TEAMS_FILE_PATH = path.resolve(__dirname, 'teams.json');

// --- File Handlers ---

/**
 * Asynchronously loads the specified JSON fixture file.
 * @param {string} file_path - The path to the fixture .json file.
 * @returns {Promise<Array<object>>} The array of fixture objects.
 */
const load_fixture_json_async = async (file_path) => {
    // try...catch will be handled by the main loop
    const file_content = await fs.readFile(file_path, 'utf8');
    return JSON.parse(file_content);
};

/**
 * Asynchronously loads the location mapper JSON file.
 * @param {string} file_path - The path to the location_mapper.json file.
 * @returns {Promise<object>} The location mapper object.
 */
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

/**
 * Asynchronously loads the teams.json file.
 * @param {string} file_path - The path to the teams.json file.
 * @returns {Promise<Array<object>>} An array of team objects.
 */
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

/**
 * Asynchronously saves the iCal data to a file.
 * @param {string} file_path - The full path to save the .ics file.
 * @param {string} ical_data - The iCal string data.
 * @returns {Promise<void>}
 */
const save_ical_file_async = async (file_path, ical_data) => {
    const dir_path = path.dirname(file_path);
    await fs.mkdir(dir_path, { recursive: true });
    await fs.writeFile(file_path, ical_data, 'utf8');
};

// --- iCal Conversion Functions ---

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
 * Converts the array of fixture objects into a single iCal string.
 * @param {Array<object>} fixtures - The array of fixture data from JSON.
 * @param {object} location_mapper - The location mapper object.
 * @returns {string}
 */
const convert_fixtures_to_ical = (fixtures, location_mapper) => {
    if (fixtures.length === 0) {
        console.warn('No fixtures found in the JSON. An empty calendar file will be created.');
    }
    const crlf = '\r\n';
    const dtstamp = format_date_for_ical(new Date());
    const ical_lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//CraigWayne//PoolFixtures v1.0//EN',
        'CALSCALE:GREGORIAN',
    ];
    for (const fixture of fixtures) {
        const start_date = parse_utc_date(fixture.date, fixture.time);
        if (!start_date) {
            console.warn(`Skipping fixture with invalid date/time: ${fixture.date}`);
            continue;
        }
        const end_date = new Date(start_date.getTime());
        end_date.setUTCHours(end_date.getUTCHours() + 2);
        const dtstart_formatted = format_date_for_ical(start_date);
        const dtend_formatted = format_date_for_ical(end_date);
        const summary = `${fixture.home_team} vs ${fixture.away_team}`;

        let location = location_mapper[fixture.venue.toLowerCase()] || fixture.venue;

        const uid = uuidv4();
        ical_lines.push(
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `SUMMARY:${summary}`,
            `LOCATION:${location}`,
            `DTSTAMP:${dtstamp}`,
            `DTSTART:${dtstart_formatted}`,
            `DTEND:${dtend_formatted}`,
            'END:VEVENT'
        );
    }
    ical_lines.push('END:VCALENDAR');
    return ical_lines.join(crlf);
};

// --- Main Execution ---

/**
 * Main async function to run the JSON -> iCal build process.
 */
const main = async () => {
    try {
        console.log('Starting JSON-to-iCal build process...');

        // Load common resources once
        const location_mapper = await load_location_mapper_async(LOCATION_MAPPER_PATH);
        const teams = await load_teams_async(TEAMS_FILE_PATH);

        if (!Array.isArray(teams) || teams.length === 0) {
            console.warn('⚠️ teams.json is empty or invalid. Nothing to process.');
            return;
        }

        console.log(`Found ${teams.length} team(s) to process...`);

        for (const team of teams) {
            if (!team || !team.name) {
                console.warn('⚠️ Skipping invalid team entry in teams.json:', team);
                continue;
            }

            const json_file_name = `fixtures-${slugify(team.name)}.json`;
            const json_file_path = path.join(DIST_DIR, json_file_name);
            const ics_file_name = `${slugify(team.name)}.ics`;
            const ics_output_path = path.join(DIST_DIR, ics_file_name);

            console.log(`--- Processing ${team.name} ---`);

            try {
                // 1. Load fixtures from JSON
                const fixtures = await load_fixture_json_async(json_file_path);

                // 2. Convert to iCal
                console.log(`Found ${fixtures.length} fixtures. Converting to iCal...`);
                const ical_string = convert_fixtures_to_ical(fixtures, location_mapper);

                // 3. Save iCal file
                await save_ical_file_async(ics_output_path, ical_string);
                console.log(`✅ Successfully created iCal file for ${team.name} at ${ics_output_path}`);

            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.error(`❌ Error for ${team.name}: JSON file not found at ${json_file_path}.`);
                    console.log(`   -> Did you run 'node fixtures-html-to-json.js' first?`);
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
