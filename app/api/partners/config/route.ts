import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase-server-auth';
import { getWhiteLabelConfig, updateBrandingConfig } from '@/lib/white-label';

export async function GET() {
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

    const config = await getWhiteLabelConfig(user.id);

    if (!config) {
      return NextResponse.json(
        { error: 'No partner configuration found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Get partner config error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch config' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { brand_name, logo_url, primary_color, accent_color } = body;

    // Validate hex colors if provided
    const hexPattern = /^#([0-9A-Fa-f]{3}){1,2}$/;
    if (primary_color && !hexPattern.test(primary_color)) {
      return NextResponse.json(
        { error: 'Invalid primary color hex value' },
        { status: 400 }
      );
    }
    if (accent_color && !hexPattern.test(accent_color)) {
      return NextResponse.json(
        { error: 'Invalid accent color hex value' },
        { status: 400 }
      );
    }

    const config = await updateBrandingConfig(user.id, {
      brand_name,
      logo_url,
      primary_color,
      accent_color,
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Update partner config error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update config' },
      { status: 500 }
    );
  }
}
