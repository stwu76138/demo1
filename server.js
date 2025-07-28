const express = require('express');
const cors = require('cors');
const line = require('@line/bot-sdk');
const OpenAI = require('openai');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// LINE Bot configuration
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create LINE client
const client = new line.Client(config);

// Apply CORS first
app.use(cors());

// LINE Bot webhook endpoint - MUST come BEFORE express.json() middleware
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    console.log('📨 Webhook received');
    const events = req.body.events;
    
    // Process each event
    const promises = events.map(async (event) => {
      try {
        if (event.type === 'message') {
          const { replyToken, message, source } = event;
          let replyMessage = '';

          if (message.type === 'text') {
            // Handle text message
            console.log('Received text message:', message.text);
            replyMessage = await processTextWithOpenAI(message.text);
            
          } else if (message.type === 'image') {
            // Handle image message
            console.log('Received image message:', message.id);
            
            try {
              const imageBuffer = await downloadImage(message.id);
              replyMessage = await analyzeImageWithOpenAI(imageBuffer);
            } catch (error) {
              console.error('Error processing image:', error);
              replyMessage = 'Sorry, I encountered an error while analyzing the image. Please try again.';
            }
            
          } else {
            // Handle other message types
            replyMessage = `I received a ${message.type} message, but I can only process text and image messages at the moment.`;
          }

          // Reply to LINE
          await client.replyMessage(replyToken, {
            type: 'text',
            text: replyMessage
          });

          console.log('Replied to user:', replyMessage);
        }
      } catch (error) {
        console.error('Error processing individual event:', error);
      }
    });

    await Promise.all(promises);
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Apply JSON parsing AFTER the LINE webhook route
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function to get image from LINE
async function downloadImage(messageId) {
  try {
    const stream = await client.getMessageContent(messageId);
    const chunks = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

// Helper function to analyze image with OpenAI
async function analyzeImageWithOpenAI(imageBuffer, userMessage = '') {
  try {
    const base64Image = imageBuffer.toString('base64');
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userMessage || "Please describe this image in detail."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error analyzing image with OpenAI:', error);
    throw error;
  }
}

// Helper function to process text with OpenAI
async function processTextWithOpenAI(text) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Respond in a friendly and concise manner."
        },
        {
          role: "user",
          content: text
        }
      ],
      max_tokens: 500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error processing text with OpenAI:', error);
    throw error;
  }
}

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the LINE Bot Backend Server!',
    status: 'Server is running successfully',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LINE Bot Server is running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /                - Welcome message`);
  console.log(`   GET  /health          - Health check`);
  console.log(`   POST /webhook         - LINE Bot webhook (main endpoint)`);
  console.log(`\n🤖 Features:`);
  console.log(`   ✅ Text message processing with OpenAI`);
  console.log(`   ✅ Image analysis with GPT-4 Vision`);
  console.log(`   ✅ LINE Bot webhook signature verification`);
  console.log(`\n⚠️  Make sure to set your environment variables:`);
  console.log(`   - LINE_CHANNEL_ACCESS_TOKEN`);
  console.log(`   - LINE_CHANNEL_SECRET`);
  console.log(`   - OPENAI_API_KEY`);
});

module.exports = app; 