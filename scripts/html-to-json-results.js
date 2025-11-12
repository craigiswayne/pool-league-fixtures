const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');
const {slugify} = require("./slugify");

const ROOT_DIR = path.resolve(__dirname, '../');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const TEAMS_FILE_PATH = path.resolve(ROOT_DIR, 'teams.json');

/**
 * Asynchronously loads the specified HTML file.
 * @param {string} file_path - The path to the HTML file.
 * @returns {Promise<string>} The HTML content.
 */
const load_html_file_async = async (file_path) => {
    return fs.readFile(file_path, 'utf8');
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
 * Asynchronously saves the fixture data to a JSON file.
 * @param {string} file_path - The full path to save the .json file.
 * @param {object} data - The fixture data array.
 * @returns {Promise<void>}
 */
const save_json_file_async = async (file_path, data) => {
    const dir_path = path.dirname(file_path);
    await fs.mkdir(dir_path, { recursive: true });
    await fs.writeFile(file_path, JSON.stringify(data, null, 2), 'utf8');
};

/**
 * Parses the HTML content to find results.
 * @param {string} html_content
 * @return {{ date: string, time: string, home_team: string, away_team: string, venue: string, result: string}[]}
 */
const parse_results = (html_content) => {
    if (!html_content) {
        throw new Error('No HTML content provided.');
    }
    const $ = cheerio.load(html_content);
    const results = [];
    const table_rows = $('table.fixed tbody tr');
    if (table_rows.length === 0) {
        console.warn('No fixture rows found in the table body.');
        return [];
    }
    table_rows.each((index, row) => {
        const cells = $(row).find('td');
        if (cells.length < 5) {
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
        const result = $(cells.get(3)).text().trim().replace(/\s/g, '');
        const away_team = $(cells.get(4)).text().trim();
        const venue = '';
        results.push({
            date,
            time,
            home_team,
            away_team,
            venue,
            result
        });
    });
    return results;
};

/**
 * Main async function to run the HTML -> JSON build process.
 */
const main = async () => {
    try {
        console.log('Starting HTML-to-JSON export process...');
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

            const html_file_name = `team-page-${slugify(team.name)}.html`;
            const html_file_path = path.join(DIST_DIR, html_file_name);
            const json_file_name = `results-${slugify(team.name)}.json`;
            const json_output_path = path.join(DIST_DIR, json_file_name);

            console.log(`--- Processing ${team.name} ---`);

            try {
                const html_content = await load_html_file_async(html_file_path);

                console.log(`Parsing HTML for ${team.name}...`);
                const results = parse_results(html_content);

                await save_json_file_async(json_output_path, results);
                console.log(`✅ Successfully created JSON file for ${team.name} at ${json_output_path}`);

            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.error(`❌ Error for ${team.name}: HTML file not found at ${html_file_path}.`);
                    console.log(`   -> Did you run 'node get-team-pages.js' first?`);
                } else {
                    console.error(`❌ An error occurred processing ${team.name}:`, error.message);
                }
            }
        }
        console.log('🎉 All HTML parsing operations finished.');
    } catch (error)
    {
        console.error(`❌ A critical error occurred:`, error.message);
        process.exit(1);
    }
};

main();
