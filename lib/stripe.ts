import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});

export const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID!,
  pro: process.env.STRIPE_PRO_PRICE_ID!,
  personal: process.env.STRIPE_PERSONAL_PRICE_ID!,
  team_starter: process.env.STRIPE_TEAM_STARTER_PRICE_ID!,
  team_pro: process.env.STRIPE_TEAM_PRO_PRICE_ID!,
  white_label: process.env.STRIPE_WHITE_LABEL_PRICE_ID!,
} as const;
