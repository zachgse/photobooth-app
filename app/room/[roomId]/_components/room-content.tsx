"use client"

import React from "react"
import Webcam from "react-webcam"
import { useRTC } from "@/app/context/RTCContext";
import { Timer } from "./timer";

interface RoomContentProps { 
    roomId: string
}

export default function RoomContent ({roomId}:RoomContentProps) {
    const context = useRTC();
    const webcamRef = React.useRef<Webcam|null>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [imgSrc,setImgSrc] = React.useState(null);
    const [time,setTime] = React.useState<number|null>(null);

    const handleUserMedia = async(stream: MediaStream) => {
        context?.createConnection(stream);
        if (context?.role == "host") {
            context.handleOffer(roomId);
        } else {
            context?.handleAnswer(roomId);
        }
    }

    React.useEffect(() => {
        const video = videoRef.current;

        if (!video || !context?.remoteStream) return;

        video.srcObject = context.remoteStream;

    }, [context?.remoteStream]);

    React.useEffect(() => {
        if (time === null) return;

        if (time === 0) {
            // call capture
            setTime(null);
            return;
        }

        const startTimer = setTimeout(() => {
            setTime((prev) => prev ? prev - 1 : 0)
        }, 1000)

        return () => clearTimeout(startTimer);
    }, [time])

    return (
        <div className="flex flex items-center justify-center gap-24">
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
                    className="w-full h-auto"
                />
                {time && <Timer time={time}/>}
            </div>

            <div className="relative w-full">
                {context?.remoteStream ? (
                    <div className="w-full h-auto">
                        <video ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-64 object-cover -scale-x-100"
                        />
                    </div>
                ) : (
                    <div className="bg-gray-300 w-full h-64 flex flex-col justify-center items-center">
                        <p>No video yet.</p>
                    </div>
                )}
                {time && <Timer time={time}/>}
            </div>

            <button onClick={() => setTime(4)}
                className="bg-blue-500 px-12 py-4 text-white rounded-lg cursor-pointer">
                    Take a picture
            </button>
        </div>
    )
}