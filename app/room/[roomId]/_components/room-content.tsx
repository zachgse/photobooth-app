"use client"

import React from "react"
import Webcam from "react-webcam"
import { useRTC } from "@/app/context/RTCContext";
import { Timer } from "./timer";
import { generatePhotoboothStrip } from "./generate-photo";
import { captureScreenshot } from "@/helper/utils";
import { doc, updateDoc } from "firebase/firestore";
import { useServerClock } from "@/helper/useServerClock";
import { db } from "@/lib/firebase";
import { useCaptureSync } from "@/helper/useCaptureSync";

interface RoomContentProps { 
    roomId: string;
}

export interface CapturedPair {
    localPic: string;
    remotePic: string;
}

export default function RoomContent ({roomId}:RoomContentProps) {
    const roomRef = doc(db,"rooms",roomId);
    const context = useRTC();
    const webcamRef = React.useRef<Webcam|null>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [time,setTime] = React.useState<number|null>(null);
    const [images,setImages] = React.useState<CapturedPair[]>([]);
    const [generatedStrip,setGeneratedStrip] = React.useState<string|null>(null);
    const { isSynced,getServerTime } = useServerClock();
    const PHOTO_TIME = 4000;

    const handleUserMedia = async(stream: MediaStream) => {
        context?.createConnection(stream);
        if (context?.role == "host") {
            context.handleOffer(roomId);
        } else {
            context?.handleAnswer(roomId);
        }
    }

    const handleCapture = async () => {
        if (!isSynced) return;

        const serverNow = getServerTime();

        if (serverNow === null) return;

        await updateDoc(roomRef, {
            captureEvent: {
                id: crypto.randomUUID(),
                captureAt: serverNow + PHOTO_TIME
            }
        });
    };

    const capturePhoto = React.useCallback(async () => {
        const localPic = webcamRef.current?.getScreenshot();
        const remotePic = captureScreenshot(videoRef.current);

        if (!localPic || !remotePic) return;

        setImages((prev) => [
            ...prev,
            {
                localPic,
                remotePic
            }
        ]);
    }, []);

    const handleGenerate = async(photos:CapturedPair[]) => {
        const strip = await generatePhotoboothStrip({
            photos:photos
        });

        setGeneratedStrip(strip);
    }

    React.useEffect(() => {
        const video = videoRef.current;

        if (!video || !context?.remoteStream) return;

        video.srcObject = context.remoteStream;

    }, [context?.remoteStream]);

    React.useEffect(() => {
        console.log("images length is ", images);
        if (images && images.length == 4) handleGenerate(images);
    }, [images]);

    useCaptureSync({roomId,getServerTime,capture:capturePhoto,onCountdownChange:setTime});

    return (
        <div className="relative w-full min-h-dvh flex flex-col items-center justify-center px-4 gap-8">

            {/* Main camera area */}
            <div className="w-full lg:w-3/5 md:w-4/5 grid grid-cols-2 relative">
                <div className="relative aspect-[3/3]">
                    <Webcam
                        mirrored
                        audio={false}
                        videoConstraints={{ facingMode: "user" }}
                        screenshotFormat="image/jpeg"
                        ref={webcamRef}
                        onUserMedia={handleUserMedia}
                        className="w-full h-full object-cover rounded-r-xl"
                    />
                </div>

                <div className="relative aspect-[3/3]">
                    {context?.remoteStream ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover -scale-x-100 rounded-l-xl"
                        />
                    ) : (
                        <div className="bg-gray-300 w-full h-full flex items-center justify-center rounded-r-xl">
                            <p>No video yet.</p>
                        </div>
                    )}
                </div>

                {/* TIME HERE */}
                {time !== null && <Timer time={time} />}
            </div>

            {/* DISPLAY PREVIEW IMAGES */}
            <div className="
                relative
                w-full
                grid grid-cols-2
                gap-2 px-8 mt-4

                md:grid-cols-1
                md:absolute
                md:-mt-0
                md:px-0
                md:w-64
                md:right-12
                md:top-1/2
                md:-translate-y-1/2
            ">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-1 items-center justify-center">
                        <div className="flex items-center justify-center gap-0 w-full">
                            <div className="bg-green-300 h-40 w-1/2" />
                            <div className="bg-blue-300 h-40 w-1/2" />
                        </div>
                        <p className="w-10 h-10 rounded-full border border-black flex items-center justify-center">
                            {i + 1}
                        </p>
                    </div>                    
                ))}
            </div>

            {/* GENERATED STRIP */}
            {generatedStrip && (
                <img
                    src={generatedStrip}
                    alt="Generated photobooth strip"
                    className="w-full max-w-xs"
                />
            )}

            {/* BUTTONS */}
            <div className="flex items-center justify-center gap-4">
                <button onClick={handleCapture}
                        className="border border-black px-12 py-4 rounded-lg cursor-pointer">
                            Retake last preview
                </button>
                <button onClick={handleCapture}
                        className="bg-black px-12 py-4 text-white rounded-lg cursor-pointer">
                            Capture
                </button>
            </div>

        </div>
    )
}