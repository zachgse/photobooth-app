export function generateRoomId() {
    return Math.random().toString(36).substring(2,8).toUpperCase();
}

export const captureScreenshot = (video: HTMLVideoElement | null) => {
    if (!video) return;

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Canvas context unavailable");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.9);
}