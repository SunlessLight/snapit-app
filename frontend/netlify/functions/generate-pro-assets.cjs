const busboy = require('busboy');
const { generateMarketingCopy, processImageBackground } = require('./services.cjs');

// Helper function to parse multipart form data without Multer
function parseMultipart(event) {
    return new Promise((resolve, reject) => {
        const bb = busboy({ headers: event.headers });
        const result = { body: {}, file: null };

        bb.on('file', (name, file, info) => {
            const { filename, encoding, mimeType } = info;
            const chunks = [];
            file.on('data', (data) => chunks.push(data));
            file.on('end', () => {
                result.file = {
                    originalname: filename,
                    mimetype: mimeType,
                    buffer: Buffer.concat(chunks)
                };
            });
        });

        bb.on('field', (name, val) => {
            result.body[name] = val;
        });

        bb.on('close', () => resolve(result));
        bb.on('error', reject);

        // Netlify sends the body as a base64 string if it contains a file
        bb.write(Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8'));
        bb.end();
    });
}

// Define standard CORS headers
const headers = {
    'Access-Control-Allow-Origin': '*', // Restrict this to your actual URL in production
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event, context) => {
    // 1. Handle CORS Preflight Requests (Browsers do this automatically)
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
        };
    }

    // 2. Busboy Safety Guard
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'Invalid Content-Type. Expected multipart/form-data.' })
        };
    }

    const abortController = new AbortController();

    try {
        const req = await parseMultipart(event);

        if (!req.file) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: "Image file is required." }) };
        }

        const { dishName, price, outputLanguage, backgroundVibe } = req.body;
        const textFields = [dishName, price, outputLanguage, backgroundVibe];

        if (textFields.some(field => typeof field !== 'string' || field.trim() === '')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: `Missing required fields. Received: dishName(${dishName}), price(${price}), lang(${outputLanguage}), vibe(${backgroundVibe})`
                })
            };
        }

        const imageBuffer = req.file.buffer;
        const mimeType = req.file.mimetype;
        const originalName = req.file.originalname;

        const copyResult = await generateMarketingCopy(
            imageBuffer,
            mimeType,
            { dishName, price, outputLanguage, backgroundVibe }
        );

        const generatedImageBase64 = await processImageBackground(
            imageBuffer,
            originalName,
            copyResult.backgroundPrompt,
            abortController.signal
        );

        // 3. Return success with CORS headers
        return {
            statusCode: 200,
            headers: {
                ...headers,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                success: true,
                data: {
                    title: copyResult.title,
                    description: copyResult.description,
                    caption: copyResult.caption,
                    backgroundPrompt: copyResult.backgroundPrompt,
                    generatedImageBase64: generatedImageBase64
                }
            })
        };

    } catch (error) {
        abortController.abort();
        console.error("[generateProAssets] Error:", error);

        if (error instanceof SyntaxError) {
            return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: "AI generation failed: Unable to parse JSON response." }) };
        }

        if (error.code === 'ECONNABORTED' || error.response?.status === 504 || error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
            return { statusCode: 504, headers, body: JSON.stringify({ success: false, error: "A backend service timed out or was aborted." }) };
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.response?.data?.message || error.message || "Internal server error"
            })
        };
    }
};