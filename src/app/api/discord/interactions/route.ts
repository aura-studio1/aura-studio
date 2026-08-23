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
            
            // Aggressive global timeout for Discord
            const timeoutPromise = new Promise<any>((resolve) => {
                setTimeout(() => {
                    resolve({
                        type: 4,
                        data: { content: '⏳ TikTok API is taking too long! Please try again or use the Recheck button.', flags: 64 }
                    });
                }, 2200); // 2.2s timeout to guarantee Discord's 3.0s deadline is met
            });
            
            const responseData = await Promise.race([
                processCheckCommand(urlOption.value),
                timeoutPromise
            ]);
            
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
                const timeoutPromise = new Promise<any>((resolve) => {
                    setTimeout(() => {
                        resolve({
                            type: 4,
                            data: { content: '⏳ TikTok API is taking too long! Please try again.', flags: 64 }
                        });
                    }, 2200);
                });
                
                const responseData = await Promise.race([
                    processCheckCommand(url),
                    timeoutPromise
                ]);
                
                // If it timed out, it will be type: 4 (ephemeral message)
                // If it succeeded, it will be type: 4 from processCheckCommand, 
                // but for components we want type: 7 (UpdateMessage) if it succeeded!
                if (!responseData.data.flags) {
                    responseData.type = 7;
                }
                
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
