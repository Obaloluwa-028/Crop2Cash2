# Crop2Cash — Complete Competition Build

Crop2Cash is an AI-assisted harvest-to-market decision platform.

## What is included

- Premium responsive landing page
- Email/password accounts with Supabase
- Farmer profiles and usernames
- Protected dashboard
- Harvest capture workflow
- Produce photo input
- Gemini multimodal visual-quality analysis
- Market quote board
- Net-value comparison across markets
- AI decision engine
- Decision result page with rationale, risks and audit trail
- Analysis history
- Printable result
- One-time browser setup page (no source-code editing required)
- Supabase RLS for farmer-owned records

## Upload/deploy flow

The project is designed for GitHub Pages.

1. Create/open a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. Upload the contents of this folder to your GitHub repository.
4. Open the site and go to `setup.html`.
5. Enter the Supabase Project URL and Publishable Key.
6. Enter a Gemini API key to enable real AI analysis.
7. Sign up as the competition/demo user.
8. Add a few market quotes on **Market Board**.
9. Run a harvest analysis.

### Supabase authentication

For the fastest demo, you may disable email confirmations in Supabase Auth settings. Supabase's normal email/password signup returns a session immediately when auto-confirm is enabled.

### AI security note

This GitHub Pages implementation calls Gemini directly from the browser. That is acceptable only for a controlled competition/demo deployment. A production version should put the Gemini key behind a server/edge function and never expose secret credentials to browser users.

## How the AI works

The pipeline is intentionally grounded:

1. Vision model analyzes only visible produce evidence.
2. User-provided market quotes become the price evidence.
3. The app computes gross and net values using quantity and user-entered costs.
4. A second AI call reasons over those grounded signals.
5. The saved result includes an audit trail and visible uncertainty.

This avoids inventing market prices or presenting unsupported live-price claims.

## Important demo rule

Do not tell judges that market prices are live unless you have connected a real market-price feed. In this version, quotes are explicitly user-entered market signals.

## Recommended competition demo

- Add 2–3 tomato market quotes with clearly labeled prices.
- Upload a strong tomato photo.
- Enter 20 crates.
- Add transport cost.
- Run the analysis.
- Open the result page.
- Show the market comparison and AI rationale.
- Open history to demonstrate persistent farmer records.
