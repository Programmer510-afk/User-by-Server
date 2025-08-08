const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // public ফোল্ডার থেকে ফাইল সার্ভ করবে

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Environment থেকে credentials নিয়ে JSON parse করছি
const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });

// আপনার স্প্রেডশিট আইডি দিন এখানে
const SPREADSHEET_ID = '1Ztj5WHUorKyU7d3Xi1UDdEmHvDanLUhs7hO8zzkcxrM';

// ✅ Sheet name sanitize করার ফাংশন
function sanitizeSheetName(email) {
  // শীটের নাম হিসেবে যেসব ক্যারেক্টার অনুমোদিত না সেগুলো "_" দিয়ে বদলানো হচ্ছে
  return email.replace(/[^a-zA-Z0-9]/g, "_");
}

app.post('/submit-email', async (req, res) => {
  const email = req.body.email;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Invalid email' });
  }

  // ✅ sanitized version ব্যবহার sheet name হিসেবে
  const sheetName = sanitizeSheetName(email);

  try {
    // নতুন শীট যোগ করার চেষ্টা (sanitize করা নাম দিয়ে)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });

    // A1 সেলে আসল email লেখা (sanitize করা না)
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[email]],
      },
    });

    res.status(200).json({ message: 'Email saved to sheet successfully!' });
  } catch (error) {
    // ✅ ডুপ্লিকেট শীট হলে redirect এর জন্য success রেসপন্স
    const reason =
      error?.errors?.[0]?.reason?.toLowerCase() ||
      error?.code?.toString().toLowerCase() ||
      error?.message?.toLowerCase() || "";
  
    // যদি শীটের নাম ডুপ্লিকেট হয়
    if (reason.includes("duplicate")) {
      return res.status(200).json({ message: 'Email already exists, proceed.' });
    }
  
    console.error(error);
    return res.status(200).json({ error: 'Failed to save email' });
  }
  
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
