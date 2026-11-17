interface PhotoboothOptions {
    photos: string[];
    width?: number;
    height?: number;
}

export async function generatePhotoboothStrip({
    photos,
    width = 600,
    height = 1800,
}: PhotoboothOptions): Promise<string> {

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Canvas context unavailable");

    canvas.width = width;
    canvas.height = height;

    // Colors
    const background = "#F7DCE8";
    const frameColor = "#FFFFFF";
    const textColor = "#69485A";

    // Background
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    // Load image helper
    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    // Load all photos before drawing
    const images = await Promise.all(photos.map(loadImage));

    // Header
    ctx.fillStyle = textColor;
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText("OUR PHOTOBOOTH", width / 2, 65);

    // Photo layout
    const photoWidth = 480;
    const photoHeight = 300;
    const photoX = (width - photoWidth) / 2;
    const photoStartY = 130;
    const photoGap = 30;
    const framePadding = 12;

    images.slice(0, 4).forEach((img, index) => {
        const y = photoStartY + index * (photoHeight + photoGap);

        // White frame
        ctx.fillStyle = frameColor;
        ctx.fillRect(
            photoX - framePadding,
            y - framePadding,
            photoWidth + framePadding * 2,
            photoHeight + framePadding * 2
        );

        // Draw photo
        ctx.save();

        ctx.beginPath();
        ctx.rect(photoX, y, photoWidth, photoHeight);
        ctx.clip();

        // Cover image (maintain aspect ratio)
        const scale = Math.max(
            photoWidth / img.width,
            photoHeight / img.height
        );

        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;

        const offsetX = (photoWidth - scaledWidth) / 2;
        const offsetY = (photoHeight - scaledHeight) / 2;

        ctx.drawImage(
            img,
            photoX + offsetX,
            y + offsetY,
            scaledWidth,
            scaledHeight
        );

        ctx.restore();
    });

    // Footer date
    ctx.fillStyle = "#777777";
    ctx.font = "18px Arial";
    ctx.textAlign = "center";

    ctx.fillText(
        new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        }).toUpperCase(),
        width / 2,
        1530
    );

    // Bottom text
    ctx.fillStyle = textColor;
    ctx.font = "bold 24px Arial";

    ctx.fillText(
        "MADE WITH LOVE ♡",
        width / 2,
        1660
    );

    // Export
    return canvas.toDataURL("image/png");
}
