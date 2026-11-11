"use client"
import { TestContext, TestContextProvider } from "@/app/context/TestContext";
import React, { useContext } from "react"
import Webcam from "react-webcam"

export default function RoomContent () {
    const context = useContext(TestContext);
    const webcamRef = React.useRef<Webcam|null>(null);

    const handleUserMedia = (stream: MediaStream) => {
        if (context) {
            stream.getTracks().forEach((track) => {
                context.rtcRef.current?.addTrack(track,stream);
            })
        }
    }

    React.useEffect(() => {
        const pc = context?.rtcRef.current;

        if (!pc) return;

        pc.ontrack = (event) => {
            context.remoteStream = event.streams[0];
        }
    }, [context?.rtcRef.current])

    return (
        <div className="flex flex items-center justify-center gap-24">
            <div className="relative w-3/5">
                <Webcam
                    mirrored
                    audio={false}
                    screenshotFormat="image/jpeg"
                    ref={webcamRef}
                    onUserMedia={handleUserMedia}
                    className="w-full h-auto"
                />
                {/* add local and remote stream components */}

                {/* capture */}
                {/* {time && (
                <p className="absolute inset-0 flex items-center justify-center text-white text-7xl bold">
                {time == 1 ? "Smile! 📸" : time - 1}
                </p>
                )} */}
            </div>

            <button className="bg-blue-500 px-12 py-4 text-white rounded-lg cursor-pointer">Take a picture</button>
        </div>
    )
}