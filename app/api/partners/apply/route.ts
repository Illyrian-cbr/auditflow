import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server-auth';
import { createServerClient } from '@/lib/supabase';

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

    const { brandName, websiteUrl, expectedClients, message } =
      await request.json();

    if (!brandName || typeof brandName !== 'string' || brandName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Brand name is required' },
        { status: 400 }
      );
    }

    if (!websiteUrl || typeof websiteUrl !== 'string') {
      return NextResponse.json(
        { error: 'Website URL is required' },
        { status: 400 }
      );
    }

    const validClientRanges = ['1-10', '11-50', '51-200', '200+'];
    if (!expectedClients || !validClientRanges.includes(expectedClients)) {
      return NextResponse.json(
        { error: 'Expected client count is required' },
        { status: 400 }
      );
    }

    const serverSupabase = createServerClient();

    // Check if user already has a partner config
    const { data: existing } = await serverSupabase
      .from('white_label_configs')
      .select('id')
      .eq('partner_user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'You have already applied to the partner program' },
        { status: 409 }
      );
    }

    // Create white_label_configs row with is_active=false (pending review)
    const { error: insertError } = await serverSupabase
      .from('white_label_configs')
      .insert({
        partner_user_id: user.id,
        brand_name: brandName.trim(),
        primary_color: '#1B2A4A',
        accent_color: '#2A9D8F',
        is_active: false,
        logo_url: null,
        custom_domain: null,
      });

    if (insertError) {
      console.error('Partner apply insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      );
    }

    // Store the application metadata (website_url, expected_clients, message)
    // in the users table partner_id or a separate applications table if needed.
    // For now, update the user's partner_id to link them.
    await serverSupabase
      .from('users')
      .update({ partner_id: user.id })
      .eq('id', user.id);

    return NextResponse.json(
      { message: 'Application submitted successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Partner apply error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit application' },
      { status: 500 }
    );
  }
}
