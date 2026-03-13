import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase';
import { resetScanCount } from '@/lib/scan-limits';
import type { SubscriptionTier } from '@/types';
import Stripe from 'stripe';

export const runtime = 'nodejs';

function getTierFromPriceId(priceId: string): SubscriptionTier {
  if (priceId === STRIPE_PRICE_IDS.pro) return 'pro';
  if (priceId === STRIPE_PRICE_IDS.starter) return 'starter';
  if (priceId === STRIPE_PRICE_IDS.personal) return 'personal';
  if (priceId === STRIPE_PRICE_IDS.team_starter) return 'team_starter';
  if (priceId === STRIPE_PRICE_IDS.team_pro) return 'team_pro';
  return 'free';
}

function isTeamTier(tier: SubscriptionTier): boolean {
  return tier === 'team_starter' || tier === 'team_pro';
}

async function getUserIdByCustomerId(customerId: string): Promise<string | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  return data?.id || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Webhook signature verification failed:', message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${message}` },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        // Get the subscription to find the price ID
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;

        if (!priceId) {
          console.error('No price ID found in subscription');
          break;
        }

        const tier = getTierFromPriceId(priceId);

        // Try to find user by customer ID first
        let userId = await getUserIdByCustomerId(customerId);

        // If not found, check session metadata
        if (!userId && session.metadata?.supabase_user_id) {
          userId = session.metadata.supabase_user_id;

          // Update the user's stripe_customer_id
          await supabase
            .from('users')
            .update({ stripe_customer_id: customerId })
            .eq('id', userId);
        }

        if (userId) {
          await supabase
            .from('users')
            .update({ subscription_tier: tier })
            .eq('id', userId);

          // For team tiers, also update the team's subscription_tier
          if (isTeamTier(tier)) {
            const { data: userTeam } = await supabase
              .from('users')
              .select('team_id')
              .eq('id', userId)
              .single();

            if (userTeam?.team_id) {
              await supabase
                .from('teams')
                .update({ subscription_tier: tier })
                .eq('id', userTeam.team_id);
            }
          }
        } else {
          console.error(
            'Could not find user for checkout.session.completed:',
            customerId
          );
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;

        if (!priceId) {
          console.error('No price ID found in updated subscription');
          break;
        }

        const tier = getTierFromPriceId(priceId);
        const userId = await getUserIdByCustomerId(customerId);

        if (userId) {
          await supabase
            .from('users')
            .update({ subscription_tier: tier })
            .eq('id', userId);
        } else {
          console.error(
            'Could not find user for customer.subscription.updated:',
            customerId
          );
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = await getUserIdByCustomerId(customerId);

        if (userId) {
          await supabase
            .from('users')
            .update({ subscription_tier: 'free' })
            .eq('id', userId);
        } else {
          console.error(
            'Could not find user for customer.subscription.deleted:',
            customerId
          );
        }

        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const userId = await getUserIdByCustomerId(customerId);

        if (userId) {
          // Get the user's current tier to reset with correct limits
          const { data: user } = await supabase
            .from('users')
            .select('subscription_tier')
            .eq('id', userId)
            .single();

          const tier = (user?.subscription_tier || 'free') as SubscriptionTier;
          await resetScanCount(userId, tier);
        } else {
          console.error(
            'Could not find user for invoice.paid:',
            customerId
          );
        }

        break;
      }

      default:
        // Unhandled event type — log and acknowledge
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
