const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB config
const mongoURI = 'mongodb+srv://v647414:223344vinay@cluster0.lus5rot.mongodb.net/urlshortener?retryWrites=true&w=majority';
const dbName = 'urlshortener';
const collectionName = 'urls';


let db;
let urlsCollection;

// Connect to MongoDB
MongoClient.connect(mongoURI, { useUnifiedTopology: true })
  .then(client => {
    console.log('✅ MongoDB Connected');
    db = client.db(dbName);
    urlsCollection = db.collection(collectionName);
  })
  .catch(err => console.error('❌ MongoDB connection failed:', err));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Serve home.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle form submission
app.post('/shorten', async (req, res) => {
  let originalUrl = req.body.originalUrl;
  const customKey = req.body.customKey;

  // Prefix https:// if needed
  if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
    originalUrl = 'https://' + originalUrl;
  }

  try {
    // Check if short key already exists
    const existing = await urlsCollection.findOne({ shortKey: customKey });
    if (existing) {
      return res.send(`<p style="color:red;">❌ That short key is already taken. Try another one.</p>
        <a href="/">Go back</a>`);
    }

    // Save to MongoDB
    await urlsCollection.insertOne({ originalUrl, shortKey: customKey });

    const shortUrl = `${req.protocol}://${req.get('host')}/${customKey}`;

    res.send(`<p>✅ Short URL created: <a href="${shortUrl}" target="_blank">${shortUrl}</a></p>
      <a href="/">Shorten another</a>`);
  } catch (err) {
    console.error('❌ Error in /shorten:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Redirect from short URL
app.get('/:shortKey', async (req, res) => {
  const shortKey = req.params.shortKey;

  try {
    const record = await urlsCollection.findOne({ shortKey });

    if (record) {
      res.redirect(record.originalUrl);
    } else {
      res.status(404).send('Short URL not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

const os = require('os');

app.listen(PORT, () => {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (let iface of Object.values(interfaces)) {
    for (let config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        addresses.push(config.address);
      }
    }
  }

  console.log(`🚀 Server running at:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  addresses.forEach(addr => {
    console.log(`   Network: http://${addr}:${PORT}`);
  });
});

