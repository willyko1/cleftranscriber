const transcriptFeed = document.getElementById('transcriptFeed');
const imageUpload = document.getElementById('imageUpload');
const imageInput = document.getElementById('imageInput');
const imageUploadResult = document.getElementById('imageUploadResult');
const imagePreview = document.getElementById('imagePreview');
const imageFileName = document.getElementById('imageFileName');
const imageFileSize = document.getElementById('imageFileSize');
const imageUploadMessage = document.getElementById('imageUploadMessage');
const imageRemove = document.getElementById('imageRemove');
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

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function clearImageUpload() {
  if (imagePreview?.src.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreview.src);
  }

  if (imageInput) imageInput.value = '';
  if (imagePreview) imagePreview.removeAttribute('src');
  if (imageUploadResult) imageUploadResult.hidden = true;
  if (imageUploadMessage) imageUploadMessage.textContent = '';
}

function displayImage(file) {
  if (!file || !imagePreview || !imageUploadResult) return;

  if (!file.type.startsWith('image/')) {
    clearImageUpload();
    if (imageUploadMessage) imageUploadMessage.textContent = 'Please choose an image file.';
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    clearImageUpload();
    if (imageUploadMessage) imageUploadMessage.textContent = 'Images must be smaller than 10 MB.';
    return;
  }

  clearImageUpload();
  imagePreview.src = URL.createObjectURL(file);
  if (imageFileName) imageFileName.textContent = file.name;
  if (imageFileSize) imageFileSize.textContent = formatFileSize(file.size);
  imageUploadResult.hidden = false;
  if (imageUploadMessage) imageUploadMessage.textContent = 'Image ready to use.';
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

  imageInput?.addEventListener('change', (event) => {
    displayImage(event.target.files[0]);
  });

  imageRemove?.addEventListener('click', clearImageUpload);

  imageUpload?.addEventListener('dragover', (event) => {
    event.preventDefault();
    imageUpload.classList.add('is-dragging');
  });

  imageUpload?.addEventListener('dragleave', () => {
    imageUpload.classList.remove('is-dragging');
  });

  imageUpload?.addEventListener('drop', (event) => {
    event.preventDefault();
    imageUpload.classList.remove('is-dragging');
    displayImage(event.dataTransfer.files[0]);
  });
});

