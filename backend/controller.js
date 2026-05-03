// controller.js
const { generateMarketingCopy, processImageBackground } = require('./services');

async function generateProAssets(req, res) {
    const abortController = new AbortController();

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "Image file is required." });
        }

        const { dishName, price, outputLanguage, backgroundVibe } = req.body;

        const textFields = [dishName, price, outputLanguage, backgroundVibe];
        if (textFields.some(field => typeof field !== 'string' || field.trim() === '')) {
            return res.status(400).json({
                success: false,
                error: `Missing required fields. Received: dishName(${dishName}), price(${price}), lang(${outputLanguage}), vibe(${backgroundVibe})`
            });
        }

        const imageBuffer = req.file.buffer;
        const mimeType = req.file.mimetype;
        const originalName = req.file.originalname;

        const copyResult = await generateMarketingCopy(
            imageBuffer,
            mimeType,
            { dishName, price, outputLanguage, backgroundVibe }
        );

        const aiBackgroundPrompt = copyResult.backgroundPrompt;

        const generatedImageBase64 = await processImageBackground(
            imageBuffer,
            originalName,
            aiBackgroundPrompt,
            abortController.signal
        );

        return res.status(200).json({
            success: true,
            data: {
                title: copyResult.title,
                description: copyResult.description,
                caption: copyResult.caption,
                backgroundPrompt: copyResult.backgroundPrompt,
                generatedImageBase64: generatedImageBase64
            }
        });

    } catch (error) {
        abortController.abort();

        console.error("[generateProAssets] Error:", error);

        if (error instanceof SyntaxError) {
            return res.status(500).json({
                success: false,
                error: "AI generation failed: Unable to parse JSON response."
            });
        }

        if (error.code === 'ECONNABORTED' || error.response?.status === 504 || error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
            return res.status(504).json({
                success: false,
                error: "A backend service timed out or was aborted."
            });
        }

        return res.status(500).json({
            success: false,
            error: error.response?.data?.message || error.message || "Internal server error"
        });
    }
}

module.exports = { generateProAssets };