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

