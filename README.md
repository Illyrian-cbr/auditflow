# Auditflow

AI-powered invoice auditing platform for small and medium-sized businesses. Detects hidden fees, overcharges, duplicate charges, and suspicious line items in vendor invoices using Claude AI.

## Tech Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **Auth:** Supabase Auth (email/password + Google OAuth)
- **Payments:** Stripe subscriptions with webhook sync
- **AI:** Claude API for invoice analysis and dispute letter generation
- **Hosting:** Vercel

## Project Structure

```
├── app/           # Pages and API routes (Next.js App Router)
├── components/    # Reusable UI components
├── lib/           # Utility functions and API helpers
│   ├── claude.ts  # Claude API client
│   ├── stripe.ts  # Stripe configuration
│   └── supabase.ts # Supabase client
├── types/         # TypeScript interfaces
└── public/        # Static assets
```

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/auditflow.git
   cd auditflow
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment variables and fill in your keys:
   ```bash
   cp .env.example .env.local
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

See `.env.example` for required configuration. You will need:

- **Supabase** project URL and keys
- **Stripe** secret and publishable keys
- **Anthropic** API key for Claude
