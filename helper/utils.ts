export function generateRoomId() {
    return Math.random().toString(36).substring(2,8);
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

export const compressPhoto = async(image:string) => {
    const response = await fetch(image);
    return response.blob();
}

export const blobToBase64 = async (blob: Blob) => {
    const buffer = await blob.arrayBuffer();

    return btoa(
        String.fromCharCode(...new Uint8Array(buffer))
    );
};

export const base64ToBlob = (base64: string) => {
    const binary = atob(base64);

    const bytes = Uint8Array.from(
        binary,
        char => char.charCodeAt(0)
    );

    return new Blob([bytes], { type: "image/jpeg" });
};