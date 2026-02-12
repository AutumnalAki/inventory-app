import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SERVICE) {
  console.warn('Supabase env keys missing for generate-demo-user route');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { role } = body || {};
    if (!role) return NextResponse.json({ error: 'Role required' }, { status: 400 });

    // Extract access token from Authorization header or cookie
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });

    // Validate request user and ensure they are Developer
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON);
    const { data: userResp, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !userResp?.user) return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 });

    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    // Check users table for developer or superadmin role
    const { data: profile, error: profileErr } = await service
      .from('users')
      .select('role')
      .eq('id', userResp.user.id)
      .single();

    const roleLower = String(profile?.role || '').toLowerCase();
    if (profileErr || !profile || (roleLower !== 'developer' && roleLower !== 'superadmin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create demo credentials
    const ts = Date.now();
    const email = `dev-preview+${ts}@labtrack.local`;
    const password = Math.random().toString(36).slice(2, 10) + Math.floor(Math.random() * 9000 + 1000);

    // Create user via admin API and confirm email immediately
    // @ts-ignore - admin available on server
    const { data: created, error: createErr } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role }
    } as any);

    if (createErr) {
      return NextResponse.json({ error: createErr.message || createErr }, { status: 500 });
    }

    // Insert into users table to reflect role and created_at
    try {
      await service.from('users').insert([{ id: created.user.id, email, username: email.split('@')[0], role }]);
    } catch (e) {
      // ignore insert errors (table may have different structure)
      console.debug('Could not insert into users table', e);
    }

    return NextResponse.json({ email, password });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
