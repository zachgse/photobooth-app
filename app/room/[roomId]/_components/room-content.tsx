"use client"

import React from "react"
import Webcam from "react-webcam"
import { useRTC } from "@/app/context/RTCContext";
import { Timer } from "./timer";
import { generatePhotoboothStrip } from "./generate-photo";
import { captureScreenshot, compressPhoto } from "@/helper/utils";

interface RoomContentProps { 
    roomId: string
}

export interface CapturedPair {
    localPic: string;
    remotePic: string
}

export default function RoomContent ({roomId}:RoomContentProps) {
    const context = useRTC();
    const webcamRef = React.useRef<Webcam|null>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [time,setTime] = React.useState<number|null>(null);
    const [images,setImages] = React.useState<CapturedPair[]>([]);
    const [generatedStrip,setGeneratedStrip] = React.useState<string|null>(null);

    const handleUserMedia = async(stream: MediaStream) => {
        context?.createConnection(stream);
        if (context?.role == "host") {
            context.handleOffer(roomId);
        } else {
            context?.handleAnswer(roomId);
        }
    }

    // only host will call this
    const capture = () => {
        const localPic = webcamRef.current?.getScreenshot();
        const remotePic = captureScreenshot(videoRef.current);

        if (!localPic || !remotePic) return;

        setImages((prev) => {
            return [
                ...prev,
                {
                    localPic:localPic,
                    remotePic:remotePic
                }
            ]
        });
        // send 1 per transac??? //////

        if (context?.role == "host") {
            sendPhoto(images)
        }
    };

    const handleGenerate = async(photos:CapturedPair[]) => {
        const strip = await generatePhotoboothStrip({
            photos:photos
        });

        setGeneratedStrip(strip);
    }

    // call everytime capture
    const sendPhoto = async(images:CapturedPair[]) => {
        if (context?.dataChannel?.readyState !== "open") return;
        images.map
        // map
        // send
        // const blob = await compressPhoto(photo);
        // const buffer = await blob.arrayBuffer();
        
        // context.dataRef.current.send(buffer);
    }

    React.useEffect(() => {
        const video = videoRef.current;

        if (!video || !context?.remoteStream) return;

        video.srcObject = context.remoteStream;

    }, [context?.remoteStream]);

    React.useEffect(() => {
        if (time === null) return;

        if (time === 0) {
            capture();
            setTime(null);
            return;
        }

        const startTimer = setTimeout(() => {
            setTime((prev) => prev ? prev - 1 : 0)
        }, 1000)

        return () => clearTimeout(startTimer);
    }, [time]);

    React.useEffect(() => {
        console.log("images length is ", images);
        if (images && images.length == 4) handleGenerate(images);
    }, [images]);

    // listener for guest 
    React.useEffect(() => {
        const channel = context?.dataChannel;

        if (context?.role == "host" || !channel) return;

        const handleMessage = (event:MessageEvent) => {
            const data = JSON.parse(event.data);

            // start capture event
            if (data.type === "PHOTO") {
                console.log("Received photo is: ", data.photo);
                // set photo here
                setImages((prev)=> [
                    ...prev,
                    {
                        localPic:data.photo.local,
                        remotePic:data.photo.remote
                    }
                ]);
            }
        }

        const handleOpen = () => {
            console.log("Data channel connected in guest");
        }
    
        channel.addEventListener("message", handleMessage);
        channel.addEventListener("open", handleOpen);

        return () => {
            channel.removeEventListener("message", handleMessage);
            channel.removeEventListener("open", handleOpen);
        }
        
    },[context?.dataChannel])

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
                    {time && <Timer time={time}/>}
                </div>

                <div className="relative w-full">
                    {context?.remoteStream ? (
                        <div className="w-full h-auto">
                            <video ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover -scale-x-100 rounded-l-xl"
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
                <button onClick={() => setTime(4)}
                    className="bg-black px-12 py-4 text-white rounded-lg cursor-pointer">
                        Capture
                </button>
            )}
        </div>
    )
}