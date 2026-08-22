import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_DISCORD_ID || '';

async function checkAdmin(req: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (!session || !session.user || session.user.id !== ADMIN_ID) {
    return false;
  }
  return true;
}

export async function GET(req: Request) {
  if (!(await checkAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from('aura_web_usage')
      .select('*')
      .order('last_reset_date', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ users: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await checkAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, discord_id, bonus_days } = body;

    if (!discord_id) {
      return NextResponse.json({ error: 'Missing discord_id' }, { status: 400 });
    }

    if (action === 'reset_quota') {
      const { data, error } = await supabase
        .from('aura_web_usage')
        .update({ usage_count: 0 })
        .eq('discord_id', discord_id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, user: data });
    } else if (action === 'update_bonus') {
      const { data, error } = await supabase
        .from('aura_web_usage')
        .update({ bonus_days })
        .eq('discord_id', discord_id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, user: data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
