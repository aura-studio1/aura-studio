import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const APP_ID = process.env.DISCORD_CLIENT_ID;

    if (!BOT_TOKEN || !APP_ID) {
        return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
    }

    const command = {
        name: 'login',
        description: 'รับรหัส PIN สำหรับล็อกอินเข้าเว็บไซต์ AURA STUDIO',
        type: 1, // CHAT_INPUT
    };

    try {
        const response = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bot ${BOT_TOKEN}`,
            },
            body: JSON.stringify(command),
        });

        if (response.ok) {
            return NextResponse.json({ success: true, data: await response.json() });
        } else {
            return NextResponse.json({ error: await response.text() }, { status: response.status });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
