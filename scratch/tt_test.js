const url = 'https://www.tiktok.com/@saran14323/video/7677171965538454791';
fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } })
  .then(res => res.text())
  .then(html => {
      const match = html.match(/id=\"__UNIVERSAL_DATA_FOR_REHYDRATION__\"[^>]*>([^<]+)/);
      if (match) {
          const data = JSON.parse(match[1]);
          const itemStruct = data.__DEFAULT_SCOPE__['webapp.video-detail'].itemInfo.itemStruct;
          console.log('Video Qualities:', itemStruct.video.bitRate.map(b => b.gear_name));
      } else {
          console.log('No data found, page title:', html.match(/<title>(.*?)<\/title>/)?.[1]);
      }
  }).catch(console.error);
