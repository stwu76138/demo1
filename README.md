# LINE Bot Backend Server

A LINE Bot webhook server integrated with OpenAI API for processing text messages and analyzing images.

## Features

- ✅ LINE Bot webhook integration
- ✅ OpenAI GPT-3.5-turbo for text processing
- ✅ OpenAI GPT-4 Vision for image analysis
- ✅ Automatic webhook signature verification
- ✅ Support for text and image messages
- ✅ Express.js server setup
- ✅ CORS enabled
- ✅ Environment variables support
- ✅ Error handling middleware
- ✅ Health check endpoint

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with your credentials:
```env
PORT=3000
NODE_ENV=development

# LINE Bot Configuration (Required)
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

# OpenAI Configuration (Required)
OPENAI_API_KEY=your_openai_api_key
```

### Getting Your Credentials

#### LINE Bot Setup:
1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Create a new provider and channel (Messaging API)
3. Get your Channel Access Token and Channel Secret from the channel settings
4. Set the webhook URL to `https://your-domain.com/webhook`

#### OpenAI Setup:
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an API key from the API keys section
3. Make sure you have credits in your account for API usage

## Usage

### Start the server (production):
```bash
npm start
```

### Start the server (development with auto-restart):
```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

### LINE Bot Webhook
- `POST /webhook` - **Main endpoint for LINE Bot messages**
  - Receives text and image messages from LINE users
  - Processes text with OpenAI GPT-3.5-turbo
  - Analyzes images with OpenAI GPT-4 Vision
  - Automatically replies back to the user

### Base Routes
- `GET /` - Welcome message
- `GET /health` - Health check endpoint

### Sample User API (for testing)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create a new user

### How It Works

1. **User sends a message** to your LINE Bot (text or image)
2. **LINE sends webhook** to your `/webhook` endpoint
3. **Server processes the message:**
   - Text messages → Sent to OpenAI GPT-3.5-turbo for response
   - Image messages → Sent to OpenAI GPT-4 Vision for analysis
4. **OpenAI responds** with processed text or image description
5. **Server replies back** to the user via LINE Bot

### Testing the Webhook (for development)

You can test the webhook locally using ngrok or similar tools:

```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 3000

# Use the ngrok URL as your LINE webhook URL
# Example: https://abc123.ngrok.io/webhook
```

### Example API Usage (for testing other endpoints)

```bash
# Health check
curl http://localhost:3000/health

# Get users
curl http://localhost:3000/api/users
```

## Project Structure

```
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── .gitignore         # Git ignore rules
├── .env              # Environment variables (create manually)
└── README.md         # Project documentation
```

## Dependencies

- **express**: Fast, unopinionated web framework for Node.js
- **@line/bot-sdk**: Official LINE Bot SDK for Node.js
- **openai**: Official OpenAI API client
- **axios**: HTTP client for API requests
- **cors**: Enable Cross-Origin Resource Sharing
- **dotenv**: Load environment variables from .env file

## Development Dependencies

- **nodemon**: Monitor for changes and automatically restart server

## Supported Message Types

- ✅ **Text Messages**: Processed with OpenAI GPT-3.5-turbo
- ✅ **Image Messages**: Analyzed with OpenAI GPT-4 Vision
- ❌ **Other Types**: Audio, Video, Location (not yet supported)

## Next Steps

You can extend this LINE bot by:
- Adding support for audio/video messages
- Implementing conversation memory/context
- Adding database for user preferences
- Creating custom OpenAI prompts for different scenarios
- Adding rich message types (templates, carousels)
- Implementing group chat functionality
- Adding user authentication and personalization
- Setting up logging and analytics
- Adding rate limiting for API calls 