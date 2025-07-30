const express = require('express');
const cors = require('cors');
const line = require('@line/bot-sdk');
const OpenAI = require('openai');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Global configuration
const IMAGE_ANALYSIS_PROMPT = `You are a professional sales engineer for Ruckus Networks, and your job is to help potential clients determine how many Ruckus wireless access points (APs) they need for a given location based on a photo.
The client will upload a photo of a place where they want to install wireless APs. Before giving your technical analysis, start with a short and friendly remark about the image — something casual, light, and conversational (e.g., "Wow, this looks like a cozy café!" or "Looks like someone needs a vacation — nice airport!"). Keep it under 15 words.
Then, based on the image, please do the following:
1. Identify what kind of place it is (e.g., office, café, meeting room, warehouse, school, etc.).
2. Estimate the approximate size in square meters (m²).
3. Determine the expected use case — e.g., high-density business environment, casual use, public Wi-Fi, conference space, etc.
4. Recommend the number of Ruckus APs needed.
5. Suggest specific Ruckus AP model(s) (e.g., R650, R750, R350), with brief justification.
6. Provide a budget estimate.
Your answer should be well-formatted using bullet points and sections like the following:


[🌟 Casual, friendly remark about the image]

**📍 Place Type:**  
[Your answer]

**📐 Estimated Size:**  
[Your estimate] (in square meters)

**🧠 Use Case:**  
[Your use case summary]

**📡 Recommended Ruckus AP(s):**  
- Model: [Model name]  
- Quantity: [Number]  
- Justification: [Why this model]

**💰 Budget Estimate:**  
Total estimated cost: $[amount] USD
`;


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
              text: userMessage || IMAGE_ANALYSIS_PROMPT
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
          content: "You are sales assistant for Ruckus Networks. User might ask you about the product, pricing, features, etc. Respond in a friendly and concise manner."
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
    message: 'Welcome to the RuckusVision Agent!',
    subtitle: 'Smart POC Assistant Powered by OpenAI Vision',
    status: 'Server is running successfully',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint for Postman (bypasses LINE signature verification)
app.post('/webhook-test', async (req, res) => {
  try {
    console.log('🧪 Test webhook received:', JSON.stringify(req.body, null, 2));
    
    // Simulate LINE webhook format
    const events = req.body.events || [req.body];
    
    if (!events || events.length === 0) {
      return res.status(400).json({ error: 'No events provided' });
    }
    
    // Process the test event (without LINE reply, just return response)
    const event = events[0];
    let response = '';
    
    if (event.type === 'message') {
      if (event.message?.type === 'text') {
        console.log('📝 Processing test text:', event.message.text);
        response = await processTextWithOpenAI(event.message.text);
      } else if (event.message?.type === 'image') {
        response = 'Image analysis would happen here (requires actual image from LINE)';
      } else {
        response = `Received ${event.message?.type || 'unknown'} message type`;
      }
    }
    
    res.json({
      status: 'success',
      originalEvent: event,
      botResponse: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Test webhook error:', error);
    res.status(500).json({
      error: 'Test webhook failed',
      message: error.message
    });
  }
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