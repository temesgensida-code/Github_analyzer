# GitHub Analyzer

A lightweight, browser-based tool to **analyze** and **compare** GitHub user profiles using the public GitHub REST API — no sign-in or token required.

## Features

| Feature | Details |
|---|---|
| **Profile Analysis** | Public repos, total stars & forks, followers, following, gists, bio, location, joined date |
| **Top Languages** | Colour-coded bar + legend derived from the user's repositories |
| **Top Repositories** | Up to 6 highest-starred repos with description, language, stars, and forks |
| **User Comparison** | Side-by-side head-to-head stats table with an **Overall Leader** trophy badge |

## Usage

1. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).
2. **Analyze tab** — type a GitHub username and press **Analyze** (or hit Enter).
3. **Compare tab** — enter two GitHub usernames and press **Compare** (or hit Enter in either field).

> **Rate limits** — The GitHub API allows 60 unauthenticated requests per hour from a given IP. If you hit the limit, wait a minute and try again.

## File Structure

```
├── index.html   # Main page & markup
├── styles.css   # Dark-mode UI styles
├── app.js       # GitHub API calls & rendering logic
└── README.md
```

## Tech Stack

- Vanilla HTML / CSS / JavaScript — zero dependencies, zero build step
- [GitHub REST API v3](https://docs.github.com/en/rest) — public endpoints only
- [Font Awesome 6](https://fontawesome.com/) (CDN) — icons
