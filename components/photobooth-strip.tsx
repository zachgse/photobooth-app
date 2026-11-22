import { CapturedPair } from "../app/room/[roomId]/_components/room-content";

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

    // Baby blue color palette
    const background = "#EAF7FC";
    const stripeColor = "#D5EDF5";
    const frameColor = "#FFFFFF";
    const textColor = "#527F91";
    const accentColor = "#86C5D8";
    const heartColor = "#A8D8E8";

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    // Helper: draw heart decorations
    const drawHeart = (
        x: number,
        y: number,
        size: number,
        color: string,
        rotation = 0
    ) => {
        ctx!.save();
        ctx!.translate(x, y);
        ctx!.rotate(rotation);
        ctx!.scale(size / 30, size / 30);

        ctx!.beginPath();
        ctx!.moveTo(0, 10);
        ctx!.bezierCurveTo(-35, -15, -25, -35, 0, -15);
        ctx!.bezierCurveTo(25, -35, 35, -15, 0, 10);

        ctx!.fillStyle = color;
        ctx!.fill();

        ctx!.restore();
    };

    // Helper: draw small stars
    const drawStar = (x: number, y: number, size: number) => {
        ctx!.save();
        ctx!.fillStyle = "#F4DFA9";
        ctx!.beginPath();

        for (let i = 0; i < 10; i++) {
            const radius = i % 2 === 0 ? size : size / 2;
            const angle = (Math.PI * i) / 5 - Math.PI / 2;

            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;

            if (i === 0) ctx!.moveTo(px, py);
            else ctx!.lineTo(px, py);
        }

        ctx!.closePath();
        ctx!.fill();
        ctx!.restore();
    };

    // Background vertical stripes
    ctx.fillStyle = stripeColor;

    for (let x = 0; x < width; x += 90) {
        ctx.fillRect(x, 0, 32, height);
    }

    // White inner background
    ctx.fillStyle = "#F8FCFD";
    ctx.fillRect(42, 0, width - 84, height);

    // Decorative border
    ctx.strokeStyle = "#A9D6E4";
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, width - 28, height - 28);

    ctx.strokeStyle = "#D1EAF1";
    ctx.lineWidth = 2;
    ctx.strokeRect(23, 23, width - 46, height - 46);

    // Background decorative hearts and stars
    [
        [35, 120, 18],
        [555, 170, 15],
        [35, 410, 13],
        [560, 540, 17],
        [35, 780, 16],
        [560, 920, 13],
        [35, 1150, 17],
        [555, 1300, 15],
        [40, 1500, 14],
        [555, 1580, 17],
    ].forEach(([x, y, size]) => {
        drawHeart(x, y, size, heartColor);
    });

    [
        [80, 200, 9],
        [520, 350, 9],
        [65, 600, 8],
        [535, 750, 9],
        [75, 1050, 8],
        [525, 1200, 9],
        [80, 1450, 8],
        [520, 1550, 9],
    ].forEach(([x, y, size]) => {
        drawStar(x, y, size);
    });

    // Load both local and remote photos
    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    const images = await Promise.all(
        photos.slice(0, 4).map(async (pair) => ({
            local: await loadImage(pair.localPic),
            remote: await loadImage(pair.remotePic),
        }))
    );

    // Header
    ctx.fillStyle = textColor;
    ctx.font = "bold 36px Georgia";
    ctx.textAlign = "center";

    // Header decoration
    drawHeart(width / 2 - 155, 62, 20, "#A8D8E8");
    drawHeart(width / 2 + 155, 62, 20, "#A8D8E8");

    ctx.font = "italic 21px Georgia";
    ctx.fillStyle = "#86B7C8";
    ctx.fillText("♡ Sweet Memories ♡", width / 2, 108);

    // Layout - unchanged
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

        // White photo frame with soft blue shadow
        ctx!.save();

        ctx!.shadowColor = "rgba(93, 151, 171, 0.25)";
        ctx!.shadowBlur = 14;
        ctx!.shadowOffsetX = 0;
        ctx!.shadowOffsetY = 4;

        ctx!.fillStyle = frameColor;
        ctx!.fillRect(
            photoX - framePadding,
            y - framePadding,
            photoWidth + framePadding * 2,
            photoHeight + framePadding * 2
        );

        ctx!.restore();

        // Subtle blue frame border
        ctx!.strokeStyle = "#C5E3EC";
        ctx!.lineWidth = 2;
        ctx!.strokeRect(
            photoX - framePadding,
            y - framePadding,
            photoWidth + framePadding * 2,
            photoHeight + framePadding * 2
        );

        // Split into two equal images - unchanged
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

        // Small decorative heart between photo sections
        drawHeart(
            width / 2,
            y + photoHeight + 14,
            17,
            "#A8D8E8"
        );
    });

    // Footer date - unchanged position
    ctx.fillStyle = "#83AAB9";
    ctx.font = "18px Georgia";
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
    ctx.font = "bold 25px Georgia";

    ctx.fillText("MADE WITH LOVE ♡", width / 2, 1660);

    // Footer subtitle
    ctx.font = "italic 19px Georgia";
    ctx.fillStyle = "#86B7C8";
    ctx.fillText("Forever in our memories", width / 2, 1700);

    return canvas.toDataURL("image/png");
}
