import { CapturedPair } from "./room-content";

interface PhotoboothOptions {
    photos: CapturedPair[];
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

    const background = "#F7DCE8";
    const frameColor = "#FFFFFF";
    const textColor = "#69485A";

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    // Load both local and remote photos
    const images = await Promise.all(
        photos.slice(0, 4).map(async (pair) => ({
            local: await loadImage(pair.localPic),
            remote: await loadImage(pair.remotePic),
        }))
    );

    // Header
    ctx.fillStyle = textColor;
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.fillText("OUR PHOTOBOOTH", width / 2, 65);

    // Layout
    const photoWidth = 480;
    const photoHeight = 260;
    const photoX = (width - photoWidth) / 2;
    const photoStartY = 130;
    const photoGap = 30;
    const framePadding = 12;
    const imageGap = 8;

    // Helper: draw image using cover sizing
    const drawCover = (
        img: HTMLImageElement,
        x: number,
        y: number,
        w: number,
        h: number
    ) => {
        const scale = Math.max(w / img.width, h / img.height);

        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;

        const offsetX = (w - scaledWidth) / 2;
        const offsetY = (h - scaledHeight) / 2;

        ctx!.save();
        ctx!.beginPath();
        ctx!.rect(x, y, w, h);
        ctx!.clip();

        ctx!.drawImage(
            img,
            x + offsetX,
            y + offsetY,
            scaledWidth,
            scaledHeight
        );

        ctx!.restore();
    };

    images.forEach((pair, index) => {
        const y = photoStartY + index * (photoHeight + photoGap);

        // White frame
        ctx!.fillStyle = frameColor;
        ctx!.fillRect(
            photoX - framePadding,
            y - framePadding,
            photoWidth + framePadding * 2,
            photoHeight + framePadding * 2
        );

        // Split into two equal images
        const singleWidth = (photoWidth - imageGap) / 2;

        // Local image - LEFT
        drawCover(
            pair.local,
            photoX,
            y,
            singleWidth,
            photoHeight
        );

        // Remote image - RIGHT
        drawCover(
            pair.remote,
            photoX + singleWidth + imageGap,
            y,
            singleWidth,
            photoHeight
        );
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

    ctx.fillText("MADE WITH LOVE ♡", width / 2, 1660);

    return canvas.toDataURL("image/png");
}

