"use client"
import { TestContext, TestContextProvider } from "@/app/context/TestContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import React, { useContext, useEffect } from "react"
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

            if (context.role === "guest") {
                let isProcessing = false;
                let unsubscribe = () => {};

                console.log("GUEST ROLE:", context.role);

                unsubscribe = onSnapshot(roomRef, async (snapshot) => {
                    try {
                        const roomData = snapshot.data();

                        console.log("Guest received room update:", roomData);

                        if (!roomData?.offer || isProcessing) return;

                        const rtc = context.rtcRef.current;

                        if (!rtc) {
                            console.error("RTCPeerConnection is null!");
                            return;
                        }

                        isProcessing = true;

                        console.log("Offer received. Setting remote description...");

                        await rtc.setRemoteDescription(roomData.offer);

                        console.log("Remote description set!");

                        const answer = await rtc.createAnswer();

                        console.log("Answer created!");

                        await rtc.setLocalDescription(answer);

                        console.log("Local description set!");

                        await updateDoc(roomRef, {
                            answer: {
                                type: answer.type,
                                sdp: answer.sdp
                            },
                            status: "answer-created"
                        });

                        console.log("ANSWER SAVED TO FIRESTORE!");

                        unsubscribe();

                    } catch (error) {
                        isProcessing = false;
                        console.error("GUEST WEBRTC ERROR:", error);
                    }
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

    useEffect(() => {
        if (!context?.rtcRef.current) return;

        const rtc = context.rtcRef.current;
        const roomRef = doc(db, "rooms", roomId);

        const unsubscribe = onSnapshot(roomRef, async (snapshot) => {
            const data = snapshot.data();

            if (
                data?.answer &&
                rtc.signalingState === "have-local-offer"
            ) {
                await rtc.setRemoteDescription(
                    new RTCSessionDescription(data.answer)
                );
            }
        });

        return () => {
            unsubscribe();
        };
    }, [roomId, context]);

    return (
        <div className="flex flex items-center justify-center gap-24">
            <div className="relative w-3/5">
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
                {context?.remoteStream ? (
                    <div>
                        <video ref={(video) => {
                            if (video) {
                                video.srcObject = context.remoteStream
                            }
                        }}
                        autoPlay
                        playsInline></video>
                    </div>
                    ) : (
                        <div className="bg-gray-300 w-full h-64 flex flex-col justify-center items-center">
                            <p>No video yet.</p>
                        </div>
                    )}
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