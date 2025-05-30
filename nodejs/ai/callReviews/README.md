# Call Reviews AI Analysis

This script analyzes call logs using OpenAI's GPT model to provide comprehensive reviews of phone call quality and content.

## Setup

1. **Environment Variables**: Create a `.env` file in this directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

2. **CSV File**: Ensure your `combined.csv` file is in this directory with the following required columns:
   - `session_id`: Unique identifier for each call session
   - `message`: The call transcript or message content

## Usage

Run the script:
```bash
node aiReviewString.js
```

## Output

The script will:
- Create a `reviews` directory if it doesn't exist
- Process each unique session_id from the CSV
- Generate individual .txt files for each session review in a structured text format
- Include detailed analysis sections for quality, content, disposition, and recommendations

## Features

- **Proper CSV Reading**: Uses csv-parser library to handle CSV files correctly
- **Error Handling**: Continues processing even if individual sessions fail
- **Security**: Uses environment variables for API keys
- **Progress Tracking**: Shows which sessions are being processed
- **Structured Text Output**: Saves reviews in an easy-to-read text format with organized sections

## Output Format

Each review file includes:
- Date, time, duration, and session ID
- Call summary
- Quality assessment (technical, UX, business)
- Content analysis (assistant and contact perspectives)
- Answer disposition (voicemail, IVR, human, other)
- Recommendations for improvement 