# NFL Playoffs 2026 Bracket Challenge 🏈

A beautiful, interactive bracket challenge app for the 2025-26 NFL Playoffs. Make your picks for Super Bowl LX!

![NFL Bracket](https://upload.wikimedia.org/wikipedia/en/a/a2/National_Football_League_logo.svg)

## Features

- ✅ Real NFL team logos from Wikipedia
- ✅ Full bracket with proper reseeding logic
- ✅ Confidence points system (1-13)
- ✅ Upset indicators 🔥
- ✅ Head-to-head comparisons
- ✅ Super Bowl tiebreaker
- ✅ Countdown to picks lock deadline
- ✅ Leaderboard with mock users
- ✅ Print-friendly bracket
- ✅ Share functionality
- ✅ Local storage persistence
- ✅ Beautiful dark theme UI

## 2025-26 Playoff Teams

### AFC
1. Denver Broncos (Bye)
2. New England Patriots
3. Jacksonville Jaguars
4. Pittsburgh Steelers
5. Houston Texans
6. Buffalo Bills
7. Los Angeles Chargers

### NFC
1. Seattle Seahawks (Bye)
2. Chicago Bears
3. Philadelphia Eagles
4. Carolina Panthers
5. Los Angeles Rams
6. San Francisco 49ers
7. Green Bay Packers

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Deploy to Vercel

### Option 1: Vercel CLI
```bash
npm i -g vercel
vercel
```

### Option 2: GitHub Integration
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your GitHub repo
5. Click "Deploy"

## Deploy to Netlify

### Option 1: Netlify CLI
```bash
npm i -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

### Option 2: Drag & Drop
1. Run `npm run build`
2. Go to [netlify.com](https://netlify.com)
3. Drag the `dist` folder to the deploy zone

### Option 3: GitHub Integration
1. Push this repo to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site" > "Import an existing project"
4. Select your GitHub repo
5. Build command: `npm run build`
6. Publish directory: `dist`
7. Click "Deploy"

## Configuration

Edit these values in `src/App.jsx`:

- `DEADLINE` - When picks lock (currently Jan 10, 2026 at 1pm PT)
- `SEEDS` - Update team seeds if they change
- `mockUsers` - Edit leaderboard users for your pool

## Tech Stack

- React 18
- Vite
- CSS-in-JS (inline styles)
- Google Fonts (Inter, Oswald)

## License

MIT - Feel free to use for your own bracket pools!

---

Built with ❤️ for NFL fans everywhere. Good luck with your picks! 🏆
