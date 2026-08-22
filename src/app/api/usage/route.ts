import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function removeDiscordRole(userId: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const roleId = process.env.DISCORD_PREMIUM_ROLE_ID;

  if (!botToken || !guildId || !roleId) {
    console.error("Missing Discord Bot credentials in env");
    return;
  }

  const url = `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`;
  
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bot ${botToken}`,
    },
  });

  if (!res.ok) {
    console.error(`Failed to remove Discord role for ${userId}:`, res.status, await res.text());
  } else {
    console.log(`Successfully removed Premium role for ${userId}`);
  }
}

async function getOrCreateUsage(discordId: string, role: string) {
  let { data, error } = await supabase
    .from('aura_web_usage')
    .select('*')
    .eq('discord_id', discordId)
    .single();

  if (error && error.code === 'PGRST116') {
    // Not found, create
    const insertData: any = { 
      discord_id: discordId, 
      role, 
      usage_count: 0, 
      last_reset_date: new Date().toISOString(),
      bonus_days: 0
    };
    
    if (role === 'premium') {
      insertData.premium_since = new Date().toISOString();
    }

    const { data: newData, error: insertError } = await supabase
      .from('aura_web_usage')
      .insert([insertData])
      .select()
      .single();
      
    if (insertError) throw insertError;
    return newData;
  }
  
  // Check if they are expired FIRST before handling their current requested role
  if (data.role === 'premium' && data.premium_since) {
    const premiumSince = new Date(data.premium_since);
    const expiry = new Date(premiumSince);
    expiry.setDate(expiry.getDate() + 30 + (data.bonus_days || 0));
    
    if (new Date() > expiry) {
      // EXPIRED! Auto-Kick and Downgrade
      await removeDiscordRole(discordId);
      
      const { data: updatedData, error: updateError } = await supabase
        .from('aura_web_usage')
        .update({ role: 'free' })
        .eq('discord_id', discordId)
        .select()
        .single();
        
      if (updateError) throw updateError;
      data = updatedData;
      role = 'free'; // override the role passed from frontend/session
    }
  }

  // Handle case where they had a record but just got upgraded to premium
  // Only do this if they haven't been downgraded just now
  if (role === 'premium' && data.role !== 'premium') {
    const { data: updatedData, error: updateError } = await supabase
      .from('aura_web_usage')
      .update({ premium_since: new Date().toISOString(), role: 'premium', bonus_days: 0 })
      .eq('discord_id', discordId)
      .select()
      .single();
    if (updateError) throw updateError;
    return updatedData;
  }

  // Also handle if they were premium but got downgraded to free manually in discord
  if (role === 'free' && data.role === 'premium') {
    const { data: updatedData, error: updateError } = await supabase
      .from('aura_web_usage')
      .update({ role: 'free' })
      .eq('discord_id', discordId)
      .select()
      .single();
    if (updateError) throw updateError;
    return updatedData;
  }

  return data;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // @ts-ignore
  const discordId = session.user.id;
  // @ts-ignore
  const role = session.user.role;

  try {
    let usage = await getOrCreateUsage(discordId, role);
    
    // Check for resets
    const lastReset = new Date(usage.last_reset_date);
    const now = new Date();
    const diffHours = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    let shouldReset = false;
    if (role === 'free' && diffHours >= (7 * 24)) {
      shouldReset = true;
    } else if (role === 'premium' && diffHours >= 24) {
      shouldReset = true;
    }

    if (shouldReset) {
      const { data, error } = await supabase
        .from('aura_web_usage')
        .update({ usage_count: 0, last_reset_date: now.toISOString() })
        .eq('discord_id', discordId)
        .select()
        .single();
      
      if (!error && data) {
        usage = data;
      }
    }

    const limit = role === 'partner' ? 999999 : (role === 'premium' ? 5 : 3);
    const isAllowed = usage.usage_count < limit;

    return NextResponse.json({
      usage: usage.usage_count,
      limit,
      role,
      isAllowed,
      last_reset_date: usage.last_reset_date,
      premium_since: usage.premium_since,
      bonus_days: usage.bonus_days
    });
  } catch (err: any) {
    console.error('Supabase error:', err.message);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // @ts-ignore
  const discordId = session.user.id;
  // @ts-ignore
  const role = session.user.role;

  try {
    let usage = await getOrCreateUsage(discordId, role);
    const limit = role === 'partner' ? 999999 : (role === 'premium' ? 5 : 3);
    
    // One more check in case it was reset right now
    const lastReset = new Date(usage.last_reset_date);
    const now = new Date();
    const diffHours = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    if ((role === 'free' && diffHours >= 7 * 24) || (role === 'premium' && diffHours >= 24)) {
      usage.usage_count = 0;
      usage.last_reset_date = now.toISOString();
    }

    if (usage.usage_count >= limit) {
      return NextResponse.json({ error: 'Limit exceeded' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('aura_web_usage')
      .update({ 
        usage_count: usage.usage_count + 1,
        last_reset_date: usage.last_reset_date
      })
      .eq('discord_id', discordId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      usage: data.usage_count,
      limit,
      role,
      last_reset_date: data.last_reset_date,
      premium_since: data.premium_since,
      bonus_days: data.bonus_days
    });
  } catch (err: any) {
    console.error('Supabase POST error:', err.message);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
