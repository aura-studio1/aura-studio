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
    const isValidRequest = await verifyKey(rawBody, signature, timestamp, DISCORD_PUBLIC_KEY);
    
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
            
            // Execute in background to completely bypass Discord 3-second limit
            Promise.resolve().then(async () => {
                try {
                    // 8-second timeout to prevent Vercel from killing the process (Hobby limit is 10s)
                    const timeoutPromise = new Promise<any>((resolve) => {
                        setTimeout(() => resolve({
                            type: 4,
                            data: { content: '⏳ TikTok API is taking too long to respond (> 8s). Please try again later.' }
                        }), 8000);
                    });
                    
                    const responseData = await Promise.race([
                        processCheckCommand(urlOption.value),
                        timeoutPromise
                    ]);
                    
                    if (responseData.data.flags) delete responseData.data.flags;
                    
                    const patchRes = await fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(responseData.data)
                    });
                    
                    if (!patchRes.ok) {
                        console.error('PATCH failed:', patchRes.status, await patchRes.text());
                    }
                } catch (e) {
                    console.error('Background processing error:', e);
                }
            });
            
            // Return DEFER immediately (Type 5: Acknowledge with "Bot is thinking...")
            return NextResponse.json({ type: 5 });
        }
    }
    
    // 5. Handle Message Components (Type 3)
    if (interaction.type === 3) {
        const { custom_id } = interaction.data;
        
        if (custom_id && custom_id.startsWith('recheck_btn_')) {
            // Get URL from message content
            const url = interaction.message.content;
            
            if (url) {
                // Execute in background
                Promise.resolve().then(async () => {
                    try {
                        const timeoutPromise = new Promise<any>((resolve) => {
                            setTimeout(() => resolve({
                                type: 4,
                                data: { content: '⏳ TikTok API is taking too long to respond (> 8s). Please try again later.' }
                            }), 8000);
                        });
                        
                        const responseData = await Promise.race([
                            processCheckCommand(url),
                            timeoutPromise
                        ]);
                        
                        if (responseData.data.flags) delete responseData.data.flags;
                        
                        const patchRes = await fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(responseData.data)
                        });
                        
                        if (!patchRes.ok) {
                            console.error('PATCH failed:', patchRes.status, await patchRes.text());
                        }
                    } catch (e) {
                        console.error('Background processing error:', e);
                    }
                });
                
                // Return DEFER update message (Type 6: Acknowledge component interaction and defer update)
                return NextResponse.json({ type: 6 });
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
