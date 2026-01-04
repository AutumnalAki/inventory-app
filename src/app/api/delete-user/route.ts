import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { authId } = await request.json();

    console.log('Delete user request for authId:', authId);
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (!authId) {
      return NextResponse.json({ error: 'Auth ID is required' }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
    }

    // Create admin client with service role key (server-side only)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Delete user from Supabase Auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(authId);

    if (error) {
      console.error('Error deleting auth user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Successfully deleted auth user:', authId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
