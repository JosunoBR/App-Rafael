import urllib.request
import json
import re
import xml.etree.ElementTree as ET
import sys

# Set stdout encoding
sys.stdout.reconfigure(encoding='utf-8')

url = 'https://www.youtube.com/watch?v=OapoLyOCFKQ'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
}
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        
        # Title
        title_match = re.search(r'<title>(.*?)</title>', html)
        print("TITLE:", title_match.group(1) if title_match else "N/A")
        
        # Description
        desc_match = re.search(r'"shortDescription":"(.*?)"', html)
        if desc_match:
            desc = desc_match.group(1).encode('utf-8').decode('unicode-escape', errors='ignore')
            with open('scratch/desc.txt', 'w', encoding='utf-8') as f:
                f.write(desc)
            print("Description saved to scratch/desc.txt")
            
        # Captions
        captions_match = re.search(r'"captionTracks":(\[.*?\])', html)
        if captions_match:
            tracks = json.loads(captions_match.group(1))
            print(f"Found {len(tracks)} caption tracks")
            for t in tracks:
                lang = t.get('languageCode')
                base_url = t.get('baseUrl')
                print("Fetching lang:", lang)
                cap_req = urllib.request.Request(base_url, headers=headers)
                with urllib.request.urlopen(cap_req) as cap_resp:
                    cap_xml = cap_resp.read().decode('utf-8', errors='ignore')
                    root = ET.fromstring(cap_xml)
                    lines = [elem.text for elem in root.findall('.//text') if elem.text]
                    with open("scratch/yt_transcript.txt", "w", encoding="utf-8") as out:
                        out.write("\n".join(lines))
                    print(f"Saved {len(lines)} transcript lines to scratch/yt_transcript.txt")
                    break
        else:
            print("No caption tracks found via regex")
except Exception as e:
    print("Error:", e)
