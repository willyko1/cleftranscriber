const transcriptFeed = document.getElementById('transcriptFeed');
const feedLines = [
  { speaker: 'Avery', text: 'The launch brief is ready for review.' },
  { speaker: 'Morgan', text: 'We need the final transcript and cleanup pass.' },
  { speaker: 'Avery', text: 'I’ll publish the updated knowledge layer.' },
  { speaker: 'Morgan', text: 'Let’s confirm the summary and action items.' }
];

function rotateTranscriptFeed() {
  if (!transcriptFeed) return;

  const nextLine = feedLines[Math.floor(Math.random() * feedLines.length)];
  const newLine = document.createElement('div');
  newLine.className = 'feed-line';

  const speaker = document.createElement('span');
  speaker.className = 'speaker';
  speaker.textContent = nextLine.speaker;

  const feedText = document.createElement('span');
  feedText.className = 'feed-text';
  feedText.textContent = nextLine.text;

  newLine.append(speaker, feedText);

  const existingLines = Array.from(transcriptFeed.children);
  if (existingLines.length >= 4) {
    transcriptFeed.removeChild(existingLines[0]);
  }

  transcriptFeed.appendChild(newLine);
}

window.addEventListener('DOMContentLoaded', () => {
  if (transcriptFeed) {
    window.setInterval(rotateTranscriptFeed, 1800);
  }

  const wordCountEl = document.getElementById('wordCount');
  if (wordCountEl) {
    let words = 842;
    window.setInterval(() => {
      words += 2;
      wordCountEl.textContent = words;
    }, 900);
  }
});
