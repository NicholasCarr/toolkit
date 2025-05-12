import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * Download an image from the given URL with authentication cookies
 * @param {string} url - The URL to download from
 * @param {string} outputPath - Where to save the downloaded file (without extension)
 * @param {object} cookies - Cookie object with authentication details
 */
async function downloadImage(url, outputPath, cookies) {
  try {
    // Convert cookies object to Cookie header string
    const cookieString = Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
    
    const response = await axios({
      method: 'GET',
      url: url,
      headers: {
        'Cookie': cookieString,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0',
        'Accept': 'image/avif,image/webp,image/apng,*/*',
        'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8',
      },
      responseType: 'stream',
    });

    // Get the content type from response headers
    const contentType = response.headers['content-type'];
    let extension = '.jpg'; // default extension
    
    // Map content types to file extensions
    if (contentType) {
      const contentTypeMap = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/avif': '.avif'
      };
      extension = contentTypeMap[contentType] || '.jpg';
    }

    // Add the extension to the output path if it doesn't already have one
    const finalOutputPath = path.extname(outputPath) ? outputPath : `${outputPath}${extension}`;

    // Create the output directory if it doesn't exist
    const dir = path.dirname(finalOutputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Create a write stream and pipe the response data to it
    const writer = fs.createWriteStream(finalOutputPath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Downloaded to: ${finalOutputPath}`);
        resolve(finalOutputPath);
      });
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Download failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    throw error;
  }
}

// Example usage: download multiple images from CSV data
async function downloadMultipleImages() {
  // Your authentication cookies (from the request you provided)
  const cookies = {
    'XSRF-TOKEN': 'eyJpdiI6IlZiNGV6SDRZZk1SY3B3WHN5NlUyV3c9PSIsInZhbHVlIjoiWlJ4Q0xkSERETzdwdDIrVGVvQndVOUpBUXBzdWF4c1dwbmN5MGk2ODdhdGwvdHJGMStoVUE4ZCtwaU1ITGJUWVhUc1lWVmxmb2J2bXZHa2Flc3JOMGQ4NVNwQ2dLbDV4MVRFSEpqTjNyZlMzYjJvVTVZY2h6eWZ4QmtQL2VvNXkiLCJtYWMiOiIzNTk5ZjMxNDA5MjIyODNkMjM1YTkxNjE3ZmNiYmUwMjkzNDNjNjNmMzQ3YmM4YzY1MGJlNTEwOTU2NjIxOTg0IiwidGFnIjoiIn0%3D',
    'idp_portal_session': 'eyJpdiI6InlSQmxoeGlDcSt3cGgxc256MmgxZEE9PSIsInZhbHVlIjoiV01yYksvQUZhQ243YkJJQ2JsWHFUeERqQ0Y3TndGSVdSOVZ6dHhxd2N3aHpjSXBTNlQ2bVNibFRBdFc0WS8valk4WWMya3lvTS9iTWdQcFJjYlBDRkFDTGVzTmw4MCtydm5oSytnZ1pKYWZQa2lyamNNejBrQUpwall4aTh4VUIiLCJtYWMiOiIwOWZjYWU0N2MyZTkwNzAxYWYzNjdlMzU3MzU3MmJjNWYxN2Q5MDcyNDNiOTEyNThhOGQ1NGM3ZjYxYjg0ZGM5IiwidGFnIjoiIn0%3D'
  };

  try {
    // Read the CSV file
    const csvContent = fs.readFileSync('./idp/orders.csv', 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });

    // Process each record from CSV
    for (const record of records) {
      const { order_id, order_status } = record;
      
      // Create URL and output path
      const url = `https://portal.internationaldrivingpermitsonline.com.au/orders/${order_id}/image/passport/cropped?timestamp=1745459574&download=true`;
      const outputPath = `./downloads/${order_status}/${order_id}`;

      try {
        await downloadImage(url, outputPath, cookies);
      } catch (error) {
        console.error(`Failed to download ${url}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error processing CSV:', error.message);
  }
}

// Run the download function
downloadMultipleImages().then(() => {
  console.log('All downloads completed!');
}).catch(err => {
  console.error('Error in download process:', err.message);
}); 