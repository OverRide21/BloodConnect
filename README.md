# BloodConnect

A responsive website connecting blood donors with recipients.

## Features
- **Donor Registration**: Sign up to be a donor.
- **Locator**: Find donors on an interactive Google Map.
- **Clean Interface**: Medical-grade aesthetic with responsive design.

## Project Structure
- `index.html`: Landing page.
- `register.html`: Registration form.
- `locate.html`: Map and sidebar for finding donors.
- `style.css`: Global styles.
- `script.js`: Client-side logic and validation.

## Local Development

1. **Clone or Download** the repository.
2. Open `index.html` in your browser.
3. For the map to work, ensure you have a valid Google Maps API Key in `locate.html`.

## Deployment on Vercel

This project is ready for immediate deployment on [Vercel](https://vercel.com).

### Method 1: Vercel CLI (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory.
3. Follow the prompts.

### Method 2: Git Integration
1. Push this code to a GitHub/GitLab/Bitbucket repository.
2. Log in to Vercel and click **"New Project"**.
3. Import your repository.
4. Vercel will automatically detect the static files.
5. Click **"Deploy"**.

### Configuration
A `vercel.json` file is included to support clean URLs (e.g., `/register` instead of `/register.html`).
