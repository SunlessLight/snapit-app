// A utility function you will call before sending the data to the backend
export async function getCroppedImg(imageElement, cropConfig) {
    const canvas = document.createElement('canvas');
    const scaleX = imageElement.naturalWidth / imageElement.width;
    const scaleY = imageElement.naturalHeight / imageElement.height;

    canvas.width = cropConfig.width;
    canvas.height = cropConfig.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
        imageElement,
        cropConfig.x * scaleX,
        cropConfig.y * scaleY,
        cropConfig.width * scaleX,
        cropConfig.height * scaleY,
        0,
        0,
        cropConfig.width,
        cropConfig.height
    );

    // Convert canvas to a File/Blob payload for the backend API
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Canvas is empty'));
                return;
            }
            blob.name = 'cropped_image.jpeg';
            resolve(blob);
        }, 'image/jpeg', 0.95);
    });
}

// Load a Blob into an Image just to read its natural dimensions. Used to detect
// that Claid's enhanced response is NOT the same size as the original we sent it
// (Claid upscales — see CLAID_FOOD_OPERATIONS.resizing), so the composite crop
// rect has to be rescaled into the enhanced blob's pixel grid before we apply it.
export async function getBlobDimensions(blob) {
    const url = URL.createObjectURL(blob);
    try {
        return await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve({ width: el.naturalWidth, height: el.naturalHeight });
            el.onerror = reject;
            el.src = url;
        });
    } finally {
        URL.revokeObjectURL(url);
    }
}

// Crop a Blob to a rect already expressed in the blob's natural pixel coordinates.
// Used to (a) re-apply the user's composite crop to Claid's enhanced response, and
// (b) derive the Results Hub "before" image (the upload, framed to match the final).
// The rect must already be in THIS blob's coordinate space (callers that crop an
// upscaled blob rescale the rect first). Different convention from getCroppedImg
// (display-pixels + an HTMLImageElement) so kept as a separate helper.
export async function cropBlobToRect(blob, rect) {
    const url = URL.createObjectURL(blob);
    try {
        const img = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = reject;
            el.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(rect.width);
        canvas.height = Math.floor(rect.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
        return await new Promise((resolve, reject) => {
            canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Canvas empty')), 'image/jpeg', 0.95);
        });
    } finally {
        URL.revokeObjectURL(url);
    }
}

