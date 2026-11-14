"use client"
import React, { createContext,useContext,useRef, useState } from "react";
import Webcam from "react-webcam";

interface Shape {
    rtcRef: React.RefObject<RTCPeerConnection|null>;
    createConnection: () => void;
    remoteStream: MediaStream | null;
    setRemoteStream: (value: MediaStream) => void;
}

export const TestContext = createContext<Shape|null>(null);

export function TestContextProvider({children}:{
    children: React.ReactNode
}) {
    const rtcRef = React.useRef<RTCPeerConnection|null>(null);
    const [remoteStream,setRemoteStream] = React.useState<MediaStream|null>(null);
    
    const createConnection = () => {
        const pc = new RTCPeerConnection({
            iceServers: [
                {
                    urls: ["stun:stun.l.google.com:19302","stun:stun2.l.google.com:19302"]
                }
            ],
            iceCandidatePoolSize: 10
        });
        rtcRef.current = pc;

        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
        }

        return pc;
    }

    const handleOffer = () => {
        
    }

    return (
        <TestContext.Provider value={{rtcRef,createConnection,remoteStream,setRemoteStream}}>
            {children}
        </TestContext.Provider>
    )
}

export const useTest = () => useContext(TestContext);


// export function Rtc() {
//     // const rtcRef = useRef<RTCPeerConnection|null>(null);

// }