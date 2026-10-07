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
        const discordId = interaction.member?.user?.id || interaction.user?.id;
        
        if (name === 'login') {
            if (!discordId) {
                return NextResponse.json({
                    type: 4,
                    data: { content: "❌ ไม่สามารถระบุตัวตนได้", flags: 64 }
                });
            }

            // Generate a 6 digit PIN valid for 5-10 minutes
            const crypto = require('crypto');
            const timeWindow = Math.floor(Date.now() / (5 * 60 * 1000));
            const secret = process.env.NEXTAUTH_SECRET || "fala_secret";
            const hash = crypto.createHmac('sha256', secret).update(`${discordId}-${timeWindow}`).digest('hex');
            const num = parseInt(hash.substring(0, 8), 16);
            const pin = (num % 1000000).toString().padStart(6, '0');

            return NextResponse.json({
                type: 4,
                data: { 
                    content: `🔐 **รหัสเข้าสู่ระบบ AURA STUDIO ของคุณคือ:** \`${pin}\`\n\nนำรหัสนี้ไปกรอกที่หน้าเว็บคู่กับ Discord ID ของคุณได้เลยครับ (รหัสนี้มีอายุ 5 นาที)`, 
                    flags: 64 // Ephemeral message (only the user can see it)
                }
            });
        }
        
        if (name === 'check') {
            const urlOption = options?.find((o: any) => o.name === 'url');
            if (!urlOption) {
                return NextResponse.json({
                    type: 4,
                    data: { content: "URL is required.", flags: 64 }
                });
            }
            
            // Vercel kills background tasks instantly. We MUST respond synchronously.
            try {
                const responseData = await processCheckCommand(urlOption.value);
                return NextResponse.json(responseData);
            } catch (e: any) {
                return NextResponse.json({
                    type: 4,
                    data: { content: '❌ Error processing request.' }
                });
            }
        }
    }
    
    // 5. Handle Message Components (Type 3)
    if (interaction.type === 3) {
        const { custom_id } = interaction.data;
        
        if (custom_id && custom_id.startsWith('recheck_btn_')) {
            const url = interaction.message.content;
            if (url) {
                try {
                    const responseData = await processCheckCommand(url);
                    responseData.type = 7; // Update message
                    return NextResponse.json(responseData);
                } catch (e: any) {
                    return NextResponse.json({
                        type: 4,
                        data: { content: '❌ Error processing request.', flags: 64 }
                    });
                }
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
