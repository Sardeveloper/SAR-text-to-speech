from gtts import gTTS
import sys

text = sys.argv[1]
file = sys.argv[2]

tts = gTTS(text=text, lang="en")
tts.save(file)

print("done")