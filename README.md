# Railway Pool League Fixtures

[![Publish Fixture Calendar](https://github.com/craigiswayne/pool-league-fixtures/actions/workflows/generate-calendars.yml/badge.svg)](https://github.com/craigiswayne/pool-league-fixtures/actions/workflows/generate-calendars.yml)

---

### How does it work?
1. Scrapes the [Website](https://douglaspoolleague.leaguerepublic.com/team/160037514/717368412.html) for fixtures
2. Saves that output to `fixtures.html`
3. Builds an `.ical` file from the above output
4. Creates a release titled `latest` with the `.ics` file as an output
5. Use this publicly available `.ics` file as calendar in any calendar application

---

### Testing locally

```shell
sh scrape.sh > fixtures.html
```

```shell
node index.js
```
