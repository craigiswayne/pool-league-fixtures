![banner.png](banner.png)

# Railway Pool League Fixtures

[![Publish Fixture Calendar](https://github.com/craigiswayne/pool-league-fixtures/actions/workflows/generate-calendars.yml/badge.svg)](https://github.com/craigiswayne/pool-league-fixtures/actions/workflows/generate-calendars.yml)

---

### How does it work?
1. Team info is stored in `teams.json`
2. Scrapes the [Douglas Pool League Website](https://douglaspoolleague.leaguerepublic.com/) for fixtures for each team in `teams.json`
3. Saves that output to `dist/upcoming-fixtures-{{team-name}}.html`
4. Builds an `dist/{{team-name}}.ics` file from the above output for each team
5. Creates a release titled `latest` with the `.ics` file as an output
6. Use this publicly available `.ics` file as calendar in any calendar application

> Example URL: https://github.com/craigiswayne/pool-league-fixtures/releases/download/latest/fixtures-railway.ics

---

### Testing locally

```shell
node get-html-fixtures.js
node fixtures-html-to-json.js
node fixtures-json-to-ics.js
```
