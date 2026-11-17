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
        <div className="lg:w-3/5 md:w-4/5 h-screen flex flex-col gap-8 items-center justify-center">
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
                    {time && <Timer time={time}/>}
                </div>

                <div className="relative w-full">
                    {context?.remoteStream ? (
                        <div className="w-full h-auto">
                            <video ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-64 object-cover -scale-x-100 rounded-l-xl"
                            />
                        </div>
                    ) : (
                        <div className="bg-gray-300 w-full h-full flex flex-col justify-center items-center rounded-r-xl">
                            <p>No video yet.</p>
                        </div>
                    )}
                    {time && <Timer time={time}/>}
                </div>
            </div>

            <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-2 px-16">
                <div className="h-60 bg-green-300"/>
                <div className="h-60 bg-green-300"/>
                <div className="h-60 bg-green-300"/>
                <div className="h-60 bg-green-300"/>
            </div>


            <button onClick={() => setTime(4)}
                className="bg-black px-12 py-4 text-white rounded-lg cursor-pointer">
                    Capture
            </button>
        </div>
    )
}