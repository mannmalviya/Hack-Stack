

# HackStack

## Scrape one public Devpost project

This command fetches one public project page and writes the extracted project text,
authors, technologies, links, and image references to a JSON file. It does not save
anything to the application database.

```bash
npm run scrape:devpost -- https://devpost.com/software/project-name ./tmp/project.json
```

Only crawl public Devpost project pages and respect Devpost's applicable terms and
rate limits.
