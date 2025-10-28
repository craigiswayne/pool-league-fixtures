import * as fs from 'fs'; // <-- Use the standard synchronous 'fs' module
import * as path from 'path';
import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { v4 as uuidv4 } from 'uuid';

// --- 1. Define Constants ---
const HTML_FILE_PATH: string = path.resolve(__dirname, 'fixtures.html');
const ICS_OUTPUT_PATH: string = path.resolve(__dirname, 'dist/fixtures.ics');

// --- 2. Define the Shared Interface ---
interface Fixture {
    date: string;
    time: string;
    home_team: string;
    away_team: string;
    venue: string;
}

// --- 3. HTML Loading Function (Synchronous) ---
const load_html_file = (file_path: string): string => {
    // fs.readFileSync will read the file and return its content
    // before moving to the next line.
    return fs.readFileSync(file_path, 'utf8');
};

// --- 4. HTML Parsing Function (Synchronous) ---
const parse_fixtures = (html_content: string): Fixture[] => {
    if (!html_content) {
        throw new Error("No HTML content provided.");
    }
    const $ = cheerio.load(html_content);
    const fixtures: Fixture[] = [];
    const table_rows = $('tbody tr');
    if (table_rows.length === 0) {
        console.warn("No fixture rows found in the table body.");
        return [];
    }
    table_rows.each((index: number, row: Element) => {
        const cells = $(row).find('td');
        if (cells.length < 6) {
            console.warn(`Skipping row ${index + 1}: Incomplete data.`);
            return;
        }
        const date_time_html: string | null = $(cells.get(1)).html();
        if (!date_time_html) {
            console.warn(`Skipping row ${index + 1}: Missing date/time.`);
            return;
        }
        const date_time_parts: string[] = date_time_html.split('<br>').map(s => s.trim());
        const date: string = date_time_parts[0] || 'N/A';
        const time: string = date_time_parts[1] || 'N/A';
        const home_team: string = $(cells.get(2)).text().trim();
        const away_team: string = $(cells.get(4)).text().trim();
        const venue: string = $(cells.get(5)).text().trim();
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

// --- 5. iCal Conversion Functions (Synchronous) ---
const parse_utc_date = (date_str: string, time_str: string): Date | null => {
    const date_parts: string[] = date_str.split('/');
    const time_parts: string[] = time_str.split(':');
    if (date_parts.length !== 3 || time_parts.length !== 2) {
        return null;
    }
    const day: number = parseInt(date_parts[0], 10);
    const month: number = parseInt(date_parts[1], 10) - 1;
    const year: number = parseInt(date_parts[2], 10) + 2000;
    const hour: number = parseInt(time_parts[0], 10);
    const minute: number = parseInt(time_parts[1], 10);
    return new Date(Date.UTC(year, month, day, hour, minute));
};

const format_date_for_ical = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

const convert_fixtures_to_ical = (fixtures: Fixture[]): string => {
    if (fixtures.length === 0) {
        throw new Error("No fixtures were parsed from the HTML.");
    }
    const crlf: string = '\r\n';
    const dtstamp: string = format_date_for_ical(new Date());
    const ical_lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//MyCodingPartner//PoolFixtures v1.0//EN',
        'CALSCALE:GREGORIAN',
    ];
    for (const fixture of fixtures) {
        const start_date: Date | null = parse_utc_date(fixture.date, fixture.time);
        if (!start_date) {
            console.warn(`Skipping fixture with invalid date/time: ${fixture.date}`);
            continue;
        }
        const end_date: Date = new Date(start_date.getTime());
        end_date.setUTCHours(end_date.getUTCHours() + 2);
        const dtstart_formatted: string = format_date_for_ical(start_date);
        const dtend_formatted: string = format_date_for_ical(end_date);
        const summary: string = `${fixture.home_team} vs ${fixture.away_team}`;
        const location: string = fixture.venue;
        const uid: string = uuidv4();
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

// --- 6. iCal Saving Function (Synchronous) ---
const save_ical_file = (file_path: string, ical_data: string): void => {
    // fs.writeFileSync will write the entire file before
    // the script moves on.
    fs.writeFileSync(file_path, ical_data, 'utf8');
};

// --- 7. Main Execution (Synchronous) ---
/**
 * Main function to run the complete build process.
 */
const main = (): void => {
    try {
        console.log(`Starting calendar build from ${HTML_FILE_PATH}...`);

        // Step 1: Load the file
        const html_content: string = load_html_file(HTML_FILE_PATH);

        // Step 2: Parse the HTML
        console.log("Parsing HTML content...");
        const fixtures: Fixture[] = parse_fixtures(html_content);

        // Step 3: Convert to iCal
        console.log(`Found ${fixtures.length} fixtures. Converting to iCal...`);
        const ical_string: string = convert_fixtures_to_ical(fixtures);

        // Step 4: Save the iCal file
        console.log("Saving iCal file...");
        save_ical_file(ICS_OUTPUT_PATH, ical_string);

        // Step 5: All done
        console.log(`✅ Successfully created iCal file at ${ICS_OUTPUT_PATH}`);

    } catch (error: any) {
        // Catch any errors from the steps above
        if (error.code === 'ENOENT') {
            console.error(`❌ Error: File not found at ${HTML_FILE_PATH}`);
        } else {
            console.error(`❌ An error occurred during the build:`, error.message);
        }
        process.exit(1); // Exit with a non-zero code to indicate failure
    }
};

// --- Run the main function ---
// This is now just a simple, direct function call.
main();