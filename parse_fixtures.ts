import * as cheerio from 'cheerio';
import * as fs from 'fs'; // Import Node.js File System module
import * as path from 'path'; // Import Node.js Path module
import type { Element } from 'domhandler';

// Define a strong type for our fixture object
interface Fixture {
    date: string;
    time: string;
    home_team: string;
    away_team: string;
    venue: string;
}

/**
 * Loads HTML content from a specified file path.
 * @param file_path The path to the HTML file.
 *a* @returns The file content as a string, or null if an error occurs.
 */
const load_html_file = (file_path: string): string | null => {
    // Resolve the path to an absolute path. __dirname is the directory of the current script.
    const absolute_path = path.resolve(__dirname, file_path);
    try {
        // Read the file synchronously and return its content as a UTF-8 string
        return fs.readFileSync(absolute_path, 'utf8');
    } catch (error: any) {
        // Use a guard clause pattern for error handling
        if (error.code === 'ENOENT') {
            console.error(`Error: File not found at ${absolute_path}`);
        } else {
            console.error(`Error reading file ${file_path}:`, error.message);
        }
        return null;
    }
};

/**
 * Parses fixture data from an HTML table.
 * @param html_content The HTML string containing the table.
 * @returns An array of Fixture objects.
 */
const parse_fixtures = (html_content: string): Fixture[] => {
    // Guard Clause: Handle empty input
    if (!html_content) {
        console.error("No HTML content provided.");
        return [];
    }

    const $ = cheerio.load(html_content);
    const fixtures: Fixture[] = [];
    const table_rows = $('tbody tr');

    // Guard Clause: Handle no rows found
    if (table_rows.length === 0) {
        console.warn("No fixture rows found in the table body.");
        return [];
    }

    // Iterate over each row
    table_rows.each((index: number, row: Element) => {
        const cells = $(row).find('td');

        // Guard Clause: Ensure row has enough cells
        if (cells.length < 6) {
            console.warn(`Skipping row ${index + 1}: Incomplete data.`);
            return;
        }

        // 1. Get Date and Time (from cell 1)
        const date_time_html: string | null = $(cells.get(1)).html();

        if (!date_time_html) {
            console.warn(`Skipping row ${index + 1}: Missing date/time.`);
            return;
        }

        const date_time_parts: string[] = date_time_html.split('<br>').map(s => s.trim());
        const date: string = date_time_parts[0] || 'N/A';
        const time: string = date_time_parts[1] || 'N/A';

        // 2. Get Home Team (from cell 2)
        const home_team: string = $(cells.get(2)).text().trim();

        // 3. Get Away Team (from cell 4)
        const away_team: string = $(cells.get(4)).text().trim();

        // 4. Get Venue (from cell 5)
        const venue: string = $(cells.get(5)).text().trim();

        // Add the structured object to our array
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

/**
 * Saves a JavaScript object (e.g., our Fixture array) to a JSON file.
 * @param file_path The desired output file path (e.g., 'fixtures.json').
 * @param data The array of Fixture objects to save.
 */
const save_json_to_file = (file_path: string, data: Fixture[]): void => {
    try {
        // Resolve the path just like we did for reading
        const absolute_path: string = path.resolve(__dirname, file_path);

        // Convert the data to a nicely formatted JSON string
        const json_data: string = JSON.stringify(data, null, 2);

        // Write the string to the file, overwriting it if it already exists
        fs.writeFileSync(absolute_path, json_data, 'utf8');

        console.log(`✅ Successfully saved JSON data to ${absolute_path}`);
    } catch (error: any) {
        console.error(`❌ Error writing JSON to file ${file_path}:`, error.message);
    }
};

/**
 * Main function to run the script.
 */
const main = () => {
    const html_file_path: string = 'fixtures.html';
    const json_output_path: string = 'fixtures.json';

    // 1. Load the HTML from the file
    const html_content: string | null = load_html_file(html_file_path);

    // Guard Clause: Stop if the file could not be read
    if (html_content === null) {
        return;
    }

    // 2. Parse the HTML content
    const fixture_data: Fixture[] = parse_fixtures(html_content);

    // Guard Clause: Stop if no data was parsed
    if (fixture_data.length === 0) {
        console.log("No fixtures were parsed from the file.");
        return;
    }

// 3. Save the resulting data to a JSON file
    save_json_to_file(json_output_path, fixture_data);
};

// --- Execution ---
main();