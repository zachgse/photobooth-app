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
        <div className="lg:w-3/5 md:w-4/5 min-h-screen flex flex-col gap-8 items-center justify-center">
            <div className="w-full flex justify-center px-12">
                <div className="relative w-full">
                    <Webcam
                        mirrored
                        audio={false}
                        videoConstraints={{facingMode:"user"}}
                        screenshotFormat="image/jpeg"
                        ref={webcamRef}
                        onUserMedia={handleUserMedia}
                        onUserMediaError={(error)=>{
                            console.error("Camera error: ", error);
                        }}
                        className="w-full h-auto rounded-r-xl"
                    />
                    {time !== null && <Timer time={time} />}
                </div>

                <div className="relative w-full">
                    {context?.remoteStream ? (
                    <video ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-96 object-cover -scale-x-100 rounded-l-xl"
                        />
                    ) : (
                        <div className="bg-gray-300 w-full h-full flex flex-col justify-center items-center rounded-r-xl">
                            <p>No video yet.</p>
                        </div>
                    )}
                    {time !== null && <Timer time={time} />}
                </div>
            </div>

            {/* DISPLAY PREVIEW IMAGES */}
            <div className="w-full grid grid-cols-2 gap-4 px-16">
                {images && images.map((image,i) => (
                    <div className="flex flex col items-center justify-center w-full gap-2" key={i}>
                        <div className="flex items-center justify-center gap-0">
                            <img src={image.localPic} alt="" className="w-full h-auto"/>
                            <img src={image.remotePic} alt="" className="w-full h-auto"/>
                        </div>
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

            {/* CAPTURE BUTTON */}
            {context?.role == "host" && (
                <button onClick={handleCapture}
                    className="bg-black px-12 py-4 text-white rounded-lg cursor-pointer">
                        Capture
                </button>
            )}
        </div>
    )
}