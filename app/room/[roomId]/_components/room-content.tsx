"use client"
import { TestContext, TestContextProvider } from "@/app/context/TestContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useContext } from "react"
import Webcam from "react-webcam"

interface RoomContentProps { 
    roomId: string
}

export default function RoomContent ({roomId}:RoomContentProps) {
    const context = useContext(TestContext);
    const webcamRef = React.useRef<Webcam|null>(null);

    const handleUserMedia = async(stream: MediaStream) => {
        if (context) {
            stream.getTracks().forEach((track) => {
                context.rtcRef.current?.addTrack(track,stream);
            });
            // check firebase room
            const roomRef = doc(db,"rooms",roomId);

            // check if offer exists then proceed to logic
            const roomSnap = await getDoc(roomRef);

            if (roomSnap.exists()){
                const roomData = roomSnap.data();

                if (roomData.offer) {
                    const offer = roomData.offer;
                    await context.rtcRef.current?.setRemoteDescription(
                        new RTCSessionDescription(offer)
                    );
                    const answer = await context.rtcRef.current?.createAnswer();
                    await updateDoc(roomRef, {
                        answer: {
                            type: answer?.type,
                            sdp: answer?.sdp
                        },
                        status: "connected"
                    });
                } else {
                    // create sdp offer
                    const offer = await context.rtcRef.current?.createOffer();
                    await context.rtcRef.current?.setLocalDescription(offer);
                    // save offer to firestore
                    
                    await updateDoc(roomRef,{
                        offer: {
                            type: offer?.type,
                            sdp: offer?.sdp
                        },
                        status: "waiting"
                    });
                }
            } else {
                // add redirect back here
                console.log("Room does not exist");
            }
        }
    }

    

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