require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const { DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID } = process.env;

if (!DISCORD_BOT_TOKEN || !DISCORD_CLIENT_ID) {
    console.error("Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID in .env.local");
    process.exit(1);
}

const commands = [
    {
        name: 'check',
        description: 'Check TikTok video statistics and download without watermark',
        options: [
            {
                name: 'url',
                description: 'The TikTok video URL',
                type: 3, // STRING
                required: true,
            }
        ]
    }
];

async function registerCommands() {
    console.log('Started refreshing application (/) commands.');
    try {
        const response = await fetch(`https://discord.com/api/v10/applications/${DISCORD_CLIENT_ID}/commands`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bot ${DISCORD_BOT_TOKEN}`
            },
            body: JSON.stringify(commands)
        });

        if (response.ok) {
            console.log('Successfully reloaded application (/) commands.');
        } else {
            console.error('Failed to register commands:', await response.text());
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

registerCommands();
