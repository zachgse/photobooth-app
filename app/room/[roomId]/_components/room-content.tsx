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
import clsx from "clsx";
import { LiaUndoAltSolid } from "react-icons/lia";
import { FaCamera } from "react-icons/fa";

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
    const [loading,setLoading] = React.useState<boolean>(false);
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
        setLoading(true);

        const serverNow = getServerTime();

        if (serverNow === null) return;

        const captureAt = serverNow + PHOTO_TIME;

        console.log("HOST: Writing capture event", {
            localTime: Date.now(),
            serverTime: serverNow,
            captureAt
        });

        await updateDoc(roomRef, {
            captureEvent: {
                id: crypto.randomUUID(),
                captureAt: serverNow + PHOTO_TIME
            }
        });
    };

    const capturePhoto = React.useCallback(async () => {
        console.log("CAPTURING PHOTO", {
            localTime: Date.now(),
            serverTime: getServerTime()
        });
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
        
        setLoading(false);
    }, []);

    const handleGenerate = async(photos:CapturedPair[]) => {
        const strip = await generatePhotoboothStrip({
            photos:photos
        });

        setGeneratedStrip(strip);
    }

    const handleRetake = () => {
        setImages((prev)=>prev.slice(0,-1));
    }

    React.useEffect(() => {
        const video = videoRef.current;

        if (!video || !context?.remoteStream) return;

        video.srcObject = context.remoteStream;

    }, [context?.remoteStream]);

    React.useEffect(() => {
        if (images && images.length == 4) handleGenerate(images);
    }, [images]);

    useCaptureSync({roomId,getServerTime,capture:capturePhoto,onCountdownChange:setTime});

    return (
        !generatedStrip ? (
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
                {images && images.length >= 1 && (
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
                        md:right-8
                        md:top-1/2
                        md:-translate-y-1/2
                    ">
                        {images.map((image, i) => (
                            <div key={i} className="flex flex-col gap-1 items-center justify-center">
                                <div className="flex items-center justify-center gap-0 w-full">
                                    <img src={image.localPic} alt={`Local Picture preview ${i+1}`}
                                        className="w-1/2 h-40"/>
                                    <img src={image.remotePic} alt={`Remote Picture preview ${i+1}`}
                                        className="w-1/2 h-40"/>
                                </div>
                                <p className="w-10 h-10 rounded-full border border-black flex items-center justify-center">
                                    {i + 1}
                                </p>
                            </div>                    
                        ))}
                    </div>
                )}

                <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
                    <button onClick={handleRetake}
                            disabled={images.length < 1}
                            className={clsx("border border-black px-12 py-4 rounded-lg flex items-center justify-center gap-2",
                                    images.length < 1 ? ("opacity-70 cursor-not-allowed")
                                                    : ("cursor-pointer")
                            )}>
                                <LiaUndoAltSolid />
                                Retake last preview
                    </button>
                    <button onClick={handleCapture}
                            disabled={loading}
                            className={clsx("bg-black px-12 py-4 text-white rounded-lg flex items-center justify-center gap-2",
                                        loading ? ("opacity-70 cursor-not-allowed") : (" cursor-pointer")
                            )}>
                                <FaCamera />
                                {loading ? "Capturing" : "Capture"}
                    </button>
                </div>
            </div>
        ) : (
            <div className="w-full min-h-dvh flex items-center justify-center">
                <img src={generatedStrip}
                    alt="Generated photobooth strip" className="w-full max-w-xs"/>
            </div>
        )
    )
}