import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { createRouteHandlerClient } from '@/lib/supabase-server-auth';
import { stripe } from '@/lib/stripe';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST() {
  try {
    // Authenticate user via cookie-aware server client
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

    const serverSupabase = createServerClient();

    // Get Stripe customer ID from users table
    const { data: dbUser } = await serverSupabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!dbUser?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Please subscribe to a plan first.' },
        { status: 400 }
      );
    }

    // Create Stripe billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripe_customer_id,
      return_url: `${APP_URL}/dashboard/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Billing portal error:', error);
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}
