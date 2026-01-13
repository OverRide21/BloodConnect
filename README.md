# BloodConnect

A responsive website connecting blood donors with recipients.

## Features
- **Donor Registration**: Sign up to be a donor with compulsory Google Sign-In.
- **Precise Location**: Automatic GPS location capture for accurate donor mapping.
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
2. **Configure Google Sign-In**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable "Google Sign-In API" (Identity Platform)
   - Create OAuth 2.0 credentials (Web application)
   - Add your domain to authorized JavaScript origins
   - Copy your Client ID
   - Replace `YOUR_GOOGLE_CLIENT_ID` in `register.html` (line 108) and `script.js` (line 30) with your actual Client ID
3. **Configure Google Maps API**:
   - Enable "Maps JavaScript API" and "Geocoding API" in Google Cloud Console
   - Replace the Google Maps API key in `register.html` and `locate.html` with your actual API key
4. Open `index.html` in your browser.

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
