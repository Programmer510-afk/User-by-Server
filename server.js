const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const creds = require('./google-credentials.json');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // public ফোল্ডার থেকে ফাইল সার্ভ করবে

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.GoogleAuth({
  credentials: creds,
  scopes: SCOPES,
});
const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID = 'আপনার গুগল শিট আইডি এখানে দিন';

app.post('/submit-email', async (req, res) => {
  const email = req.body.email;
  
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Invalid email' });
  }
  
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
        {
          addSheet: {
            properties: {
              title: email,
            },
          },
        }, ],
      },
    });
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${email}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [email]
        ],
      },
    });
    
    res.status(200).json({ message: 'Email saved to sheet successfully!' });
  } catch (error) {
    if (error.errors && error.errors[0].reason === 'duplicate') {
      return res.status(400).json({ error: 'Sheet already exists for this email' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to save email' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});