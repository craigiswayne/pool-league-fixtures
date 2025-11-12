const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const DIST_DIR = path.resolve(__dirname, 'dist');
const LOCATION_MAPPER_PATH = path.resolve(__dirname, 'location_mapper.json');
const TEAMS_FILE_PATH = path.resolve(__dirname, 'teams.json');

/**
 * Asynchronously loads the specified HTML file.
 * @param {string} file_path - The path to the HTML file.
 * @returns {Promise<string>} The HTML content.
 */
const load_html_file_async = async (file_path) => {
    return fs.readFile(file_path, 'utf8');
};

/**
 * Asynchronously loads the location mapper JSON file.
 * @param {string} file_path - The path to the location_mapper.json file.
 * @returns {Promise<object>} The location mapper object.
 */
const load_location_mapper_async = async (file_path) => {
    try {
        await fs.access(file_path); // Check if file exists
        const file_content = await fs.readFile(file_path, 'utf8');
        return JSON.parse(file_content);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`Warning: Location mapper file not found at ${file_path}. Using default venues.`);
        } else {
            console.error(`Error loading location mapper: ${error.message}`);
        }
        return {}; // Return an empty mapper
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
        // Re-throw the error to stop the main function
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

/**
 * Parses the HTML content to find fixtures.
 * @param {string} html_content
 * @return {{ date: string, time: string, home_team: string, away_team: string, venue: string }[]}
 */
const parse_fixtures = (html_content) => {
    if (!html_content) {
        throw new Error('No HTML content provided.');
    }
    const $ = cheerio.load(html_content);
    const fixtures = [];
    const table_rows = $('table:not(.fixed) tbody tr');
    if (table_rows.length === 0) {
        console.warn('No fixture rows found in the table body.');
        return [];
    }
    table_rows.each((index, row) => {
        const cells = $(row).find('td');
        if (cells.length < 6) {
            console.warn(`Skipping row ${index + 1}: Incomplete data.`);
            return;
        }
        const date_time_html = $(cells.get(1)).html();
        if (!date_time_html) {
            console.warn(`Skipping row ${index + 1}: Missing date/time.`);
            return;
        }
        const date_time_parts = date_time_html.split('<br>').map(s => s.trim());
        const date = date_time_parts[0] || 'N/A';
        const time = date_time_parts[1] || 'N/A';
        const home_team = $(cells.get(2)).text().trim();
        const away_team = $(cells.get(4)).text().trim();
        const venue = $(cells.get(5)).text().trim();
        fixtures.push({
            date,
            time,
            home_team,
            away_team,
            venue
        });
    });
    return fixtures;
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

const convert_fixtures_to_ical = (fixtures, location_mapper) => {
    if (fixtures.length === 0) {
        console.warn('No fixtures were parsed from the HTML. An empty calendar file will be created.');
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

/**
 * Main async function to run the build process for all teams.
 */
const main = async () => {
    try {
        console.log('Starting calendar build process...');

        const location_mapper = await load_location_mapper_async(LOCATION_MAPPER_PATH);
        const teams = await load_teams_async(TEAMS_FILE_PATH);

        if (!Array.isArray(teams) || teams.length === 0) {
            console.warn('⚠️ teams.json is empty or invalid. Nothing to process.');
            return;
        }

        console.log(`Found ${teams.length} team(s) to process...`);

        for (const team of teams) {
            if (!team || !team.team) {
                console.warn('⚠️ Skipping invalid team entry in teams.json:', team);
                continue;
            }

            const team_name = team.team;
            const team_name_lower = team_name.toLowerCase();

            const html_file_name = `upcoming-fixtures-${team_name_lower}.html`;
            const html_file_path = path.join(DIST_DIR, html_file_name);

            const ics_file_name = `fixtures-${team_name_lower}.ics`;
            const ics_output_path = path.join(DIST_DIR, ics_file_name);

            console.log(`--- Processing ${team_name} ---`);

            try {
                const html_content = await load_html_file_async(html_file_path);

                console.log(`Parsing HTML for ${team_name}...`);
                const fixtures = parse_fixtures(html_content);

                console.log(`Found ${fixtures.length} fixtures. Converting to iCal...`);
                const ical_string = convert_fixtures_to_ical(fixtures, location_mapper);

                await save_ical_file_async(ics_output_path, ical_string);
                console.log(`✅ Successfully created iCal file for ${team_name} at ${ics_output_path}`);

            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.error(`❌ Error for ${team_name}: HTML file not found at ${html_file_path}.`);
                    console.log(`   -> Did you run 'node get-html-fixtures.js' first?`);
                } else {
                    console.error(`❌ An error occurred processing ${team_name}:`, error.message);
                }
            }
        }

        console.log('🎉All parsing operations finished.');

    } catch (error) {
        // This outer catch handles critical errors (like failing to load teams.json)
        console.error(`❌ A critical error occurred:`, error.message);
        process.exit(1);
    }
};

// Run the script
main();
