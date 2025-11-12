![banner.png](banner.png)

# Railway Pool League Fixtures

[![Publish Fixture Calendar](https://github.com/craigiswayne/pool-league-fixtures/actions/workflows/generate-calendars.yml/badge.svg)](https://github.com/craigiswayne/pool-league-fixtures/actions/workflows/generate-calendars.yml)

---

### How does it work?
1. Team info is stored in `teams.json`
2. Scrapes the [Douglas Pool League Website](https://douglaspoolleague.leaguerepublic.com/) for fixtures for each team in `teams.json`
3. Saves that output to `dist/upcoming-fixtures-{{team-name}}.html`
4. Builds an `dist/fixtures-{{team-name}}.ical` file from the above output for each team
5. Creates a release titled `latest` with the `.ics` file as an output
6. Use this publicly available `.ics` file as calendar in any calendar application

---

### Testing locally

```shell
node get-html-fixtures.js
```

```shell
node create-calendars.js
```
