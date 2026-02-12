import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase admin client — requires SUPABASE_SERVICE_ROLE_KEY in env
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn('Supabase admin client not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

const supabaseAdmin = createClient(url || '', serviceKey || '');

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }

    // Validate token and get user
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token as string);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = userData.user.id;

    // Confirm user is Developer in users table
    const { data: userRow, error: rowErr } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (rowErr || !userRow || String(userRow.role).toLowerCase() !== 'developer') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const body = await req.json();
    const title = typeof body.title === 'string' ? body.title : '';
    const description = typeof body.description === 'string' ? body.description : '';
    // Ensure required columns are present for existing schema
    const version = typeof body.version === 'string' && body.version.trim() !== '' ? body.version : '0.0.0';
    const type = typeof body.type === 'string' && body.type.trim() !== '' ? body.type : 'feature';
    const changes = Array.isArray(body.changes) ? body.changes : [];

    const insertPayload: any = { title, description, version, type, changes, created_by: userId };

    const { error: insertErr } = await supabaseAdmin.from('update_logs').insert([insertPayload]);
    if (insertErr) {
      console.error('Insert error', insertErr);
      return NextResponse.json({ error: insertErr }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
