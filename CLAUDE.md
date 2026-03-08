# Auditflow — Project Context

## What is Auditflow?
Auditflow is an AI-powered SaaS platform that helps small and medium-sized businesses detect hidden fees, overcharges, duplicate charges, and suspicious line items in vendor invoices. It uses Claude AI to analyze invoices, flag problems, generate dispute letters, and benchmark pricing against real-time market data.

## Who is it for?
Primary target: SMBs in construction and home services — property managers, general contractors, facility managers who process 10-50+ vendor invoices per month and don't have dedicated accounting teams. They're currently eyeballing invoices manually and losing money to overcharges.

## Business Model
Three-tier SaaS subscription with hard scan limits (no overages):
- Free: 2 scans/month, Tier 1 analysis only, no dispute letters
- Starter ($29/mo): 50 scans/month, full Tier 1 analysis + AI dispute letter generation
- Pro ($59/mo): 150 scans/month, everything in Starter + market rate benchmarking via web search, savings reports, vendor trend tracking

When a user hits their scan limit, they are locked out until the next billing cycle or must upgrade. No exceptions.

## Two Analysis Tiers
Tier 1 (Audit + Act): Extract all line items from an uploaded invoice using Claude vision. Flag vague charges (misc, admin fee, handling), detect duplicates, verify math, identify phantom fees, spot formatting tricks. Generate a professional dispute letter referencing flagged items.

Tier 2 (Audit + Benchmark — Pro only): Everything in Tier 1, plus use Claude web search tool to look up regional market rates for each major charge. Compare invoiced rates against averages and flag anything 20%+ above market. Show total potential savings.

## Tech Stack
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS
- Database: Supabase (PostgreSQL) with Row Level Security
- Auth: Supabase Auth (email/password + Google OAuth)
- Payments: Stripe subscriptions with webhook sync
- AI: Claude Haiku 4.5 API (model: claude-haiku-4-5-20251001) for invoice analysis
- Web Search: Claude web search tool for Tier 2 benchmarking
- File Handling: Claude vision API reads PDFs and images directly
- Hosting: Vercel with GitHub auto-deploy

## Design Direction
Professional, clean, trustworthy. Navy (#1B2A4A) primary, teal (#2A9D8F) accent, light cream/white backgrounds. The app should feel like a financial tool, not a toy.

## Key Architecture Decisions
- Scan limits are enforced server-side via a scan_counts table checked before every API call
- Stripe webhooks reset scan counts on invoice.paid and update tiers on subscription changes
- Tier 2 benchmarking checks a local pricing_benchmarks cache before falling back to web search (Phase 2)
- All analysis results are stored as JSONB in Supabase for fast retrieval

## Build Phases
Phase 1 (MVP): Auth, Stripe, scan limits, landing page, dashboard, invoice upload, Tier 1 + Tier 2 analysis, dispute letters, history, settings
Phase 2: Pricing database cache, vendor trends, PDF reports, email notifications, bulk upload, mobile improvements
Phase 3: Team accounts, public API, QuickBooks/Xero integration, consumer lite version, white-label for accounting firms
