import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_PASSWORD = "1339000029568";

function checkAdmin(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${ADMIN_PASSWORD}`) {
    return true;
  }
  return false;
}

export async function GET(req: Request) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized: Wrong Password' }, { status: 401 });
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
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized: Wrong Password' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, discord_id, bonus_days, role, premium_since, usage_count } = body;

    if (!discord_id) {
      return NextResponse.json({ error: 'Missing discord_id' }, { status: 400 });
    }

    if (action === 'reset_quota') {
      const { data, error } = await supabase
        .from('aura_web_usage')
        .update({ 
           usage_count: 0, 
           smooth_usage_count: 0,
           last_reset_date: new Date().toISOString(),
           smooth_last_reset_date: new Date().toISOString()
        })
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
    } else if (action === 'update_role') {
      const { data, error } = await supabase
        .from('aura_web_usage')
        .update({ role, premium_since: role === 'premium' && !premium_since ? new Date().toISOString() : premium_since })
        .eq('discord_id', discord_id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, user: data });
    } else if (action === 'update_premium_since') {
      const { data, error } = await supabase
        .from('aura_web_usage')
        .update({ premium_since })
        .eq('discord_id', discord_id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, user: data });
    } else if (action === 'update_usage') {
      const { data, error } = await supabase
        .from('aura_web_usage')
        .update({ usage_count })
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
