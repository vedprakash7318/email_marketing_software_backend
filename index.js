const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Initialize BullMQ Worker
require('./workers/emailWorker');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads folder statically for images/videos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic route
app.get('/', (req, res) => {
  res.send('Email Automation API is running...');
});

// Define API Routes
app.use('/api/accounts', require('./routes/accountRoutes'));
app.use('/api/contacts', require('./routes/contactRoutes'));
app.use('/api/campaigns', require('./routes/campaignRoutes'));
app.use('/api/logs', require('./routes/logRoutes'));
app.use('/api/templates', require('./routes/templateRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));

// Public Unsubscribe Route
app.get('/unsubscribe/:email', async (req, res) => {
  try {
    const Contact = require('./models/Contact');
    const email = req.params.email;
    const contact = await Contact.findOneAndUpdate(
      { email },
      { status: 'unsubscribed' }
    );
    
    if (contact) {
      res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Successfully Unsubscribed</h2>
          <p>You have been removed from our mailing list and will no longer receive emails from us.</p>
        </div>
      `);
    } else {
      res.status(404).send('<h2>Contact not found</h2>');
    }
  } catch (error) {
    res.status(500).send('<h2>Error processing unsubscribe</h2>');
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
