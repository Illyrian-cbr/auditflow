import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server-auth';
import { createServerClient } from '@/lib/supabase';
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const VALID_TEAM_PRICES = new Set([
  STRIPE_PRICE_IDS.team_starter,
  STRIPE_PRICE_IDS.team_pro,
]);

export async function POST(request: NextRequest) {
  try {
    const authClient = await createRouteHandlerClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: 'Missing priceId' },
        { status: 400 }
      );
    }

    if (!VALID_TEAM_PRICES.has(priceId)) {
      return NextResponse.json(
        { error: 'Invalid priceId. Must be a team plan price.' },
        { status: 400 }
      );
    }

    const serverSupabase = createServerClient();

    // Check if user already has a Stripe customer ID
    const { data: dbUser } = await serverSupabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = dbUser?.stripe_customer_id;

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      customerId = customer.id;

      // Save Stripe customer ID to users table
      await serverSupabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/dashboard/team?checkout=success`,
      cancel_url: `${APP_URL}/dashboard/team`,
      metadata: {
        supabase_user_id: user.id,
        type: 'team',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Team checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
