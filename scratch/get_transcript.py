import sys
sys.path.append(r"C:\Users\Josué\AppData\Roaming\Python\Python314\site-packages")

from youtube_transcript_api import YouTubeTranscriptApi

try:
    transcript_list = YouTubeTranscriptApi.list_transcripts("OapoLyOCFKQ")
    print("Available transcripts:")
    for t in transcript_list:
        print(t.language, t.language_code, t.is_generated)
    
    # Try finding pt
    transcript = transcript_list.find_transcript(['pt', 'pt-BR', 'en'])
    entries = transcript.fetch()
    with open("scratch/video_transcript.txt", "w", encoding="utf-8") as f:
        for entry in entries:
            text = entry.get('text', '') if isinstance(entry, dict) else entry.text
            start = entry.get('start', 0) if isinstance(entry, dict) else entry.start
            duration = entry.get('duration', 0) if isinstance(entry, dict) else entry.duration
            f.write(f"[{start:.1f}s - {start+duration:.1f}s] {text}\n")
    print(f"Successfully downloaded {len(entries)} transcript entries!")
except Exception as e:
    print("Transcript error:", e)
