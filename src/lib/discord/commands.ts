import * as MP4Box from 'mp4box';

const TIKWM_API = 'https://www.tikwm.com/api/';

export async function fetchTikTokData(url: string) {
    try {
        const response = await fetch(`${TIKWM_API}?url=${encodeURIComponent(url)}`);
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
                return reject(new Error("Failed to fetch video stream"));
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

export async function processCheckCommand(url: string) {
    try {
        const ttData = await fetchTikTokData(url);
        
        // Extract extra metadata from actual MP4
        let width = 0, height = 0, codec = "Unknown", fps = 0;
        try {
            if (ttData.play) {
                const meta = await extractVideoMetadata(ttData.play);
                width = meta.width;
                height = meta.height;
                codec = meta.codec === "avc1" ? "h264" : (meta.codec === "hev1" || meta.codec === "hvc1" ? "h265" : meta.codec);
                fps = meta.fps;
            }
        } catch (e) {
            console.warn("Failed to extract video headers:", e);
        }

        const sizeMB = ttData.size ? (ttData.size / (1024 * 1024)).toFixed(1) : "0";
        const bitrateMbps = (ttData.size && ttData.duration) 
            ? (((ttData.size * 8) / (ttData.duration * 1000 * 1000))).toFixed(1) 
            : "0";
        
        const isShadowBanned = ttData.is_nff_or_nr ? "Yes" : "No";

        // Build Discord Embed
        return {
            type: 4,
            data: {
                embeds: [
                    {
                        color: 0x2b2d31,
                        author: {
                            name: `${ttData.author.nickname || ttData.author.unique_id}`,
                            icon_url: ttData.author.avatar,
                        },
                        description: `📅 ${formatDate(ttData.create_time)}\n\n**${ttData.title}**\n\n🎵 ${ttData.music_info?.title || "Original Sound"} • ${ttData.duration}s`,
                        fields: [
                            {
                                name: "📊 Statistics",
                                value: `• 👁️ ${formatNumber(ttData.play_count)} Views\n• 🤍 ${formatNumber(ttData.digg_count)} Likes\n• 💬 ${formatNumber(ttData.comment_count)} Comments\n• 📥 ${formatNumber(ttData.download_count)} Downloads\n• ⭐ ${formatNumber(ttData.collect_count)} Saves\n• 🔗 ${formatNumber(ttData.share_count)} Shares`,
                                inline: false
                            },
                            {
                                name: "ℹ️ Info",
                                value: `• 🆔 ID | \`${ttData.id}\`\n• 🌐 Region | ${ttData.region}\n• 👻 Shadow ban | ${isShadowBanned}`,
                                inline: false
                            },
                            {
                                name: "⭐ Quality",
                                value: `• 🌐 play_addr\n${height}p${fps} • ${bitrateMbps} Mbps • ${codec} • ${sizeMB} MB\n\n| **Original** | \`${width}x${height}\` • \`${fps}fps\``,
                                inline: false
                            }
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
                                label: "Download Video",
                                style: 5,
                                url: ttData.play
                            },
                            ...(ttData.music_info?.play ? [{
                                type: 2,
                                label: "Download Audio",
                                style: 5,
                                url: ttData.music_info.play
                            }] : [])
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
