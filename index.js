const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

// --- 1. Define Constants ---
const HTML_FILE_PATH = path.resolve(__dirname, 'fixtures.html');
const ICS_OUTPUT_PATH = path.resolve(__dirname, 'dist/fixtures.ics');

// --- 2. HTML Loading Function (Synchronous) ---
const load_html_file = (file_path) => {
    return fs.readFileSync(file_path, 'utf8');
};

// --- 3. HTML Parsing Function (Synchronous) ---
const parse_fixtures = (html_content) => {
    if (!html_content) {
        throw new Error("No HTML content provided.");
    }
    const $ = cheerio.load(html_content);
    const fixtures = [];
    const table_rows = $('tbody tr');
    if (table_rows.length === 0) {
        console.warn("No fixture rows found in the table body.");
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

// --- 4. iCal Conversion Functions (Synchronous) ---
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

const convert_fixtures_to_ical = (fixtures) => {
    if (fixtures.length === 0) {
        throw new Error("No fixtures were parsed from the HTML.");
    }
    const crlf = '\r\n';
    const dtstamp = format_date_for_ical(new Date());
    const ical_lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//MyCodingPartner//PoolFixtures v1.0//EN',
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
        const location = fixture.venue;
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

// --- 5. iCal Saving Function (Synchronous) ---
const save_ical_file = (file_path, ical_data) => {
    const dir_path = path.dirname(file_path);
    if (!fs.existsSync(dir_path)) {
        fs.mkdirSync(dir_path, { recursive: true });
        console.log(`Created new directory at: ${dir_path}`);
    }
    fs.writeFileSync(file_path, ical_data, 'utf8');
};

// --- 6. Main Execution (Synchronous) ---
const main = () => {
    try {
        console.log(`Starting calendar build from ${HTML_FILE_PATH}...`);
        const html_content = load_html_file(HTML_FILE_PATH);

        console.log("Parsing HTML content...");
        const fixtures = parse_fixtures(html_content);

        console.log(`Found ${fixtures.length} fixtures. Converting to iCal...`);
        const ical_string = convert_fixtures_to_ical(fixtures);

        console.log("Saving iCal file...");
        save_ical_file(ICS_OUTPUT_PATH, ical_string);

        console.log(`✅ Successfully created iCal file at ${ICS_OUTPUT_PATH}`);

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ Error: File not found at ${HTML_FILE_PATH}`);
        } else {
            console.error(`❌ An error occurred during the build:`, error.message);
        }
        process.exit(1);
    }
};

main();