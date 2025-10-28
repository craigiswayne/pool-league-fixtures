import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid'; // For creating unique event IDs

// Define the Fixture type (matches our JSON structure)
interface Fixture {
    date: string;
    time: string;
    home_team: string;
    away_team: string;
    venue: string;
}

/**
 * Parses the "dd/mm/yy" and "HH:MM" strings into a UTC Date object.
 * We must do this manually as this format is not standard.
 * @param date_str - The date string, e.g., "28/10/25"
 * @param time_str - The time string, e.g., "20:30"
 * @returns A Date object set to the specified UTC date and time.
 */
const parse_utc_date = (date_str: string, time_str: string): Date | null => {
    const date_parts: string[] = date_str.split('/');
    const time_parts: string[] = time_str.split(':');

    // Guard Clause: Ensure format is correct
    if (date_parts.length !== 3 || time_parts.length !== 2) {
        return null;
    }

    // parseInt(string, 10) ensures we parse in base-10
    const day: number = parseInt(date_parts[0], 10);
    const month: number = parseInt(date_parts[1], 10) - 1; // JavaScript months are 0-indexed (0=Jan, 11=Dec)
    const year: number = parseInt(date_parts[2], 10) + 2000; // '25' -> 2025
    const hour: number = parseInt(time_parts[0], 10);
    const minute: number = parseInt(time_parts[1], 10);

    // Use Date.UTC() to create a date in the GMT+0 timezone, as requested.
    return new Date(Date.UTC(year, month, day, hour, minute));
};

/**
 * Formats a Date object into the iCal-required timestamp format.
 * (e.g., "20251028T203000Z")
 * @param date - The Date object to format.
 * @returns A string in the iCal UTC format.
 */
const format_date_for_ical = (date: Date): string => {
    // .toISOString() gives "2025-10-28T20:30:00.000Z"
    // We just need to remove the dashes, colons, and milliseconds.
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

/**
 * Main function to read JSON and write the iCal file.
 */
const create_ical_file = (): void => {
    const json_file_path: string = path.resolve(__dirname, 'fixtures.json');
    const ics_file_path: string = path.resolve(__dirname, 'fixtures.ics');

    // --- 1. Load the JSON file ---
    let fixtures: Fixture[];
    try {
        const json_content: string = fs.readFileSync(json_file_path, 'utf8');
        fixtures = JSON.parse(json_content);
    } catch (error: any) {
        console.error(`❌ Error reading JSON file at ${json_file_path}:`, error.message);
        return;
    }

    // Guard Clause: Check if fixtures exist
    if (!Array.isArray(fixtures) || fixtures.length === 0) {
        console.warn("No fixtures found in the JSON file.");
        return;
    }

    // --- 2. Build the iCal String ---
    const crlf: string = '\r\n'; // iCal spec requires CRLF line endings
    const dtstamp: string = format_date_for_ical(new Date()); // A timestamp for *when* this file was created

    const ical_lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//MyCodingPartner//PoolFixtures v1.0//EN',
        'CALSCALE:GREGORIAN',
    ];

    // Loop over each fixture and create a VEVENT
    for (const fixture of fixtures) {
        const start_date: Date | null = parse_utc_date(fixture.date, fixture.time);

        // Guard Clause: Skip if date is invalid
        if (!start_date) {
            console.warn(`Skipping fixture with invalid date/time: ${fixture.date}`);
            continue;
        }

        // Create end time (assuming 2 hours, as per previous logic)
        const end_date: Date = new Date(start_date.getTime());
        end_date.setUTCHours(end_date.getUTCHours() + 2); // Add 2 hours

        // Format dates for iCal
        const dtstart_formatted: string = format_date_for_ical(start_date);
        const dtend_formatted: string = format_date_for_ical(end_date);

        // Create event details
        const summary: string = `${fixture.home_team} vs ${fixture.away_team}`;
        const location: string = fixture.venue;
        const uid: string = uuidv4(); // Generate a unique ID

        // Add the event lines
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

    // --- 3. Save the .ics file ---
    try {
        const ical_string: string = ical_lines.join(crlf);
        fs.writeFileSync(ics_file_path, ical_string, 'utf8');
        console.log(`✅ Successfully saved iCal file to ${ics_file_path}`);
    } catch (error: any) {
        console.error(`❌ Error writing .ics file:`, error.message);
    }
};

// --- Execution ---
create_ical_file();