const token = 'MTUzODQwNTM5Mjk0NDcyNjA4Nw.GxeUJA._5BtLE670hWxUr_bBRDam8-ITCLysUBDEXRv4g';
const appId = '1538405392944726087';
const guildId = '1538759961792876594';

const url = `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`;
const globalUrl = `https://discord.com/api/v10/applications/${appId}/commands`;

const command = {
    name: 'check',
    description: 'Check and get details for a TikTok video',
    options: [
        {
            name: 'url',
            description: 'The TikTok video URL',
            type: 3,
            required: true
        }
    ]
};

async function register() {
    try {
        const globalRes = await fetch(globalUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(command)
        });
        const globalData = await globalRes.json();
        console.log('Global Registration:', globalData);

        const guildRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(command)
        });
        const guildData = await guildRes.json();
        console.log('Guild Registration:', guildData);
    } catch (e) {
        console.error(e);
    }
}

register();
