const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static frontend files from current directory
app.use(express.static(__dirname));

// Helper to get file path for a language
function getFilePath(lang) {
  return path.join(__dirname, `vocab_${lang}.json`);
}

// Helper to read vocabulary from file
function readVocab(lang) {
  const filePath = getFilePath(lang);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading vocab file for ${lang}:`, err);
    return [];
  }
}

// Helper to write vocabulary to file
function writeVocab(lang, vocabList) {
  const filePath = getFilePath(lang);
  try {
    fs.writeFileSync(filePath, JSON.stringify(vocabList, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing vocab file for ${lang}:`, err);
    return false;
  }
}

// API: Get Vocabulary list
app.get('/api/vocab/:lang', (req, res) => {
  const lang = req.params.lang;
  if (lang !== 'en' && lang !== 'ja') {
    return res.status(400).json({ error: 'Invalid language code. Use "en" or "ja".' });
  }
  const vocab = readVocab(lang);
  res.json(vocab);
});

// API: Add Vocabulary words
app.post('/api/vocab/:lang', (req, res) => {
  const lang = req.params.lang;
  const newItems = req.body; // Expecting array of vocabulary objects

  if (lang !== 'en' && lang !== 'ja') {
    return res.status(400).json({ error: 'Invalid language' });
  }
  if (!Array.isArray(newItems)) {
    return res.status(400).json({ error: 'Request body must be an array of words' });
  }

  const existingVocab = readVocab(lang);

  newItems.forEach(item => {
    // Avoid duplicates by comparing Korean word or target word
    const exists = existingVocab.some(existing => 
      existing.korean.trim().toLowerCase() === item.korean.trim().toLowerCase() ||
      existing.translated.trim().toLowerCase() === item.translated.trim().toLowerCase()
    );
    
    if (!exists) {
      existingVocab.push({
        korean: item.korean,
        translated: item.translated,
        pronunciation: item.pronunciation || '',
        example: item.example || '',
        createdAt: new Date().toISOString()
      });
    }
  });

  if (writeVocab(lang, existingVocab)) {
    res.json({ success: true, count: existingVocab.length, data: existingVocab });
  } else {
    res.status(500).json({ error: 'Failed to write vocabulary data to disk' });
  }
});

// API: Clear vocabulary list
app.post('/api/vocab/:lang/clear', (req, res) => {
  const lang = req.params.lang;
  if (lang !== 'en' && lang !== 'ja') {
    return res.status(400).json({ error: 'Invalid language' });
  }
  
  if (writeVocab(lang, [])) {
    res.json({ success: true, message: 'Vocabulary cleared' });
  } else {
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

// API: Export vocabulary to CSV
app.get('/api/vocab/:lang/csv', (req, res) => {
  const lang = req.params.lang;
  if (lang !== 'en' && lang !== 'ja') {
    return res.status(400).send('Invalid language');
  }

  const vocab = readVocab(lang);
  
  // Create CSV header and rows
  // UTF-8 BOM is added (\ufeff) to make sure Excel opens Korean/Japanese characters without corrupting them
  let csvContent = '\ufeff';
  csvContent += '원어(한국어),번역(학습어),발음,예문,등록일\n';

  vocab.forEach(item => {
    // Escape double quotes in CSV fields
    const escapeCsv = (text) => {
      if (!text) return '';
      const stringified = String(text).replace(/"/g, '""');
      return stringified.includes(',') || stringified.includes('\n') || stringified.includes('"') 
        ? `"${stringified}"` 
        : stringified;
    };

    const row = [
      escapeCsv(item.korean),
      escapeCsv(item.translated),
      escapeCsv(item.pronunciation),
      escapeCsv(item.example),
      escapeCsv(item.createdAt || '')
    ].join(',');

    csvContent += row + '\n';
  });

  // Set response headers for file download
  const filename = `lingotutor_vocab_${lang}_${new Date().toISOString().split('T')[0]}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csvContent);
});

// Fallback: Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` LingoTutor Backend Server running on port ${PORT}`);
  console.log(` Access your app: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
