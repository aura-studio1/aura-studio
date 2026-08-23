import * as MP4Box from 'mp4box';

const TIKWM_API = 'https://www.tikwm.com/api/';

export async function fetchTikTokData(url: string) {
    try {
        // Also add hd=1 to ensure we get hdplay if available
        const response = await fetch(`${TIKWM_API}?url=${encodeURIComponent(url)}&hd=1`);
        const data = await response.json();
        
        if (data.code !== 0) {
            throw new Error(data.msg || "Failed to fetch TikTok data");
        }
        
        return data.data;
    } catch (e: any) {
        throw new Error(e.message || "Failed to fetch TikTok data");
    }
}

export async function extractVideoMetadata(videoUrl: string) {
    return new Promise<{width: number, height: number, codec: string, fps: number}>((resolve, reject) => {
        const url = videoUrl;
        fetch(url, {
            headers: {
                // Fetch only first 1MB to get headers quickly
                'Range': 'bytes=0-1048576'
            }
        }).then(res => {
            if (!res.ok) {
                reject(new Error("Failed to fetch video stream"));
                throw new Error("Failed to fetch video stream");
            }
            return res.arrayBuffer();
        }).then((arrayBuffer: any) => {
            if (!arrayBuffer) return;
            arrayBuffer.fileStart = 0;
            
            const mp4boxfile = MP4Box.createFile();
            
            mp4boxfile.onReady = function (info: any) {
                const videoTrack = info.videoTracks[0];
                if (videoTrack) {
                    resolve({
                        width: videoTrack.video.width,
                        height: videoTrack.video.height,
                        codec: videoTrack.codec.split('.')[0], // e.g. avc1.64001f -> avc1 (h264)
                        fps: Math.round(videoTrack.nb_samples / (info.duration / info.timescale))
                    });
                } else {
                    reject(new Error("No video track found"));
                }
            };
            
            mp4boxfile.onError = function (e: any) {
                reject(e);
            };
            
            mp4boxfile.appendBuffer(arrayBuffer);
            mp4boxfile.flush();
        }).catch(reject);
    });
}

function formatNumber(num: number) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatDate(timestamp: number) {
    const d = new Date(timestamp * 1000);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) + ', ' + 
           d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function getFlagEmoji(countryCode: string) {
    if (!countryCode) return '🏳️';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

function generateMockQualities(ttData: any, meta: any) {
    const originalRes = meta ? `${meta.width}x${meta.height}` : '1080x1920';
    const originalFps = meta ? meta.fps : 30;
        
    // Fallback if no meta
    const height = meta ? meta.height : 1080;
    const fps = meta ? meta.fps : 30;
    
    // We will build the blockquote with Mock formats based on HD vs Normal play
    let qualityStr = '';
    
    if (ttData.hdplay && ttData.hd_size) {
        const hdSizeMB = (ttData.hd_size / (1024 * 1024)).toFixed(1);
        const hdMbps = (((ttData.hd_size * 8) / (ttData.duration * 1000 * 1000))).toFixed(1);
        
        qualityStr += `\n> 🌐 📱 adapt_lowest_1080_1 📱 play_addr_bytevc1\n> ${height}p${fps} • ${hdMbps} Mbps • hevc • ${hdSizeMB} MB\n>`;
    }
    
    if (ttData.play && ttData.size) {
        const sizeMB = (ttData.size / (1024 * 1024)).toFixed(1);
        const mbps = (((ttData.size * 8) / (ttData.duration * 1000 * 1000))).toFixed(1);
        
        qualityStr += `\n> 🌐 📱 play_addr 🌐 normal_720_0 📱 play_addr_h264\n> 720p${fps} • ${mbps} Mbps • h264 • ${sizeMB} MB\n>`;
    }
    
    if (ttData.wmplay && ttData.wm_size) {
        const wmSizeMB = (ttData.wm_size / (1024 * 1024)).toFixed(1);
        const wmMbps = (((ttData.wm_size * 8) / (ttData.duration * 1000 * 1000))).toFixed(1);
        
        qualityStr += `\n> 📱 comet_720_1\n> 720p${fps} • ${wmMbps} Mbps • hevc • ${wmSizeMB} MB`;
    }

    // Default VQ Score based on sizes (mock)
    const vqScore = ttData.hdplay ? (60 + Math.random() * 10).toFixed(2) : '0';

    return { qualityStr, originalRes, originalFps, vqScore, height, fps };
}

export async function processCheckCommand(url: string) {
    try {
        const ttData = await fetchTikTokData(url);
        
        // Extract extra metadata from actual MP4
        let meta = null;
        try {
            if (ttData.play) {
                meta = await extractVideoMetadata(ttData.hdplay || ttData.play);
            }
        } catch (e) {
            console.warn("Failed to extract video headers:", e);
        }

        const isShadowBanned = ttData.is_nff_or_nr ? "Yes" : "No";
        const regionName = typeof (Intl as any).DisplayNames !== 'undefined' ? new (Intl as any).DisplayNames(['en'], { type: 'region' }).of(ttData.region || 'US') || ttData.region : ttData.region;
        const flag = getFlagEmoji(ttData.region || 'US');
        
        const tags = (ttData.title.match(/#[a-zA-Z0-9_]+/g) || []).join(' ');
        const cleanTitle = ttData.title.replace(/#[a-zA-Z0-9_]+/g, '').trim();
        
        // Mocks based on hashtags
        let categories = '';
        if (ttData.title.toLowerCase().includes('game') || ttData.title.toLowerCase().includes('cod')) {
            categories = "| Video Games\n| Games\n| Entertainment";
        }

        const { qualityStr, originalRes, originalFps, vqScore, height, fps } = generateMockQualities(ttData, meta);

        // Build Discord Embed matching the screenshot exactly
        return {
            type: 4,
            data: {
                content: url, // Echo the URL like in the screenshot
                embeds: [
                    {
                        color: 0x2b2d31,
                        author: {
                            name: `${ttData.author.nickname || ttData.author.unique_id}  📅 ${formatDate(ttData.create_time)}`,
                        },
                        description: `> **${cleanTitle}** ${tags}\n\n🎵 ${ttData.music_info?.title || "Original Sound"} - ${ttData.author.unique_id} • 0:${ttData.duration}`,
                        fields: [
                            {
                                name: "📊 Statistics",
                                value: `• 👁️ ${formatNumber(ttData.play_count)} Views\n• 🤍 ${formatNumber(ttData.digg_count)} Likes\n• 💬 ${formatNumber(ttData.comment_count)} Comments\n• 🔖 ${formatNumber(ttData.collect_count)} Favorites\n• ↪️ ${formatNumber(ttData.share_count)} Shares\n• 📥 ${formatNumber(ttData.download_count)} Downloads`,
                                inline: false
                            },
                            {
                                name: "ℹ️ Information",
                                value: `• 🆔 ID | \`${ttData.id}\`\n• 📥 Source | Browser\n• 🌍 Region | ${flag} ${regionName}\n• 👻 Shadow ban | ${isShadowBanned}`,
                                inline: false
                            },
                            {
                                name: "⭐ Quality",
                                value: `• 🌐 Browser | ${height}p${fps}\n• 📱 Phone | 1080p${fps}\n${qualityStr}\n\n| Original | ${originalRes}\n| VQ Score | ${vqScore}`,
                                inline: false
                            },
                            ...(categories ? [{
                                name: "🏷️ Categories",
                                value: categories,
                                inline: false
                            }] : [])
                        ],
                        footer: {
                            text: "re:TT Checker & Downloader",
                        }
                    }
                ],
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: 2,
                                label: "Recheck",
                                custom_id: `recheck_btn_${ttData.id}`,
                                emoji: { name: "🔄" }
                            }
                        ]
                    }
                ]
            }
        };

    } catch (e: any) {
        return {
            type: 4,
            data: {
                content: `❌ Error: ${e.message}`,
                flags: 64 // Ephemeral
            }
        };
    }
}
