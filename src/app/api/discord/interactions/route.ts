import { NextRequest, NextResponse } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { processCheckCommand } from '@/lib/discord/commands';

// Your public key from the Discord Developer Portal
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || '';

export async function POST(req: NextRequest) {
    // 1. Verify the signature from Discord
    const signature = req.headers.get('X-Signature-Ed25519');
    const timestamp = req.headers.get('X-Signature-Timestamp');
    
    if (!signature || !timestamp) {
        return new NextResponse('Missing signature', { status: 401 });
    }
    
    const rawBody = await req.text();
    const isValidRequest = verifyKey(rawBody, signature, timestamp, DISCORD_PUBLIC_KEY);
    
    if (!isValidRequest) {
        return new NextResponse('Bad request signature', { status: 401 });
    }
    
    // 2. Parse the body
    const interaction = JSON.parse(rawBody);
    
    // 3. Handle PING (Type 1)
    if (interaction.type === 1) {
        return NextResponse.json({ type: 1 });
    }
    
    // 4. Handle Application Commands (Type 2)
    if (interaction.type === 2) {
        const { name, options } = interaction.data;
        
        if (name === 'check') {
            const urlOption = options?.find((o: any) => o.name === 'url');
            if (!urlOption) {
                return NextResponse.json({
                    type: 4,
                    data: { content: "URL is required.", flags: 64 }
                });
            }
            
            // Note: In serverless functions, you technically have 3 seconds to respond to Discord.
            // Since fetching video headers might take 1-2 seconds, it fits within 3 seconds,
            // but if it timeouts, Discord will show "The application did not respond".
            // A more robust way is to DEFER (type 5) and edit the response later, 
            // but let's try responding directly first for simplicity.
            
            const responseData = await processCheckCommand(urlOption.value);
            return NextResponse.json(responseData);
        }
    }
    // 5. Handle Message Components (Type 3)
    if (interaction.type === 3) {
        const { custom_id } = interaction.data;
        
        if (custom_id && custom_id.startsWith('recheck_btn_')) {
            // Get URL from message content
            const url = interaction.message.content;
            
            if (url) {
                const responseData = await processCheckCommand(url);
                // processCheckCommand returns type: 4 (ChannelMessageWithSource), 
                // but for components we want type: 7 (UpdateMessage)
                responseData.type = 7;
                return NextResponse.json(responseData);
            } else {
                return NextResponse.json({
                    type: 4,
                    data: { content: "❌ Could not find URL in message content.", flags: 64 }
                });
            }
        }
    }
    
    return NextResponse.json({ error: 'Unknown interaction type' }, { status: 400 });
}

