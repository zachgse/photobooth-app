"use client"
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import React, { createContext,useContext } from "react";

interface RTCInterface {
    rtcRef: React.RefObject<RTCPeerConnection|null>;
    dataChannel: RTCDataChannel | null;
    setDataChannel: (dataChannel:RTCDataChannel) => void;
    createConnection: (localStream:MediaStream) => void;
    remoteStream: MediaStream | null;
    setRemoteStream: (mediaStream:MediaStream) => void;
    role: Role;
    setRole: (role: Role) => void;
    handleOffer: (roomId:string) => void;
    handleAnswer: (roomId:string) => void;
}

type Role = "host" | "guest" | null;

export const RTCContext = createContext<RTCInterface|null>(null);

export function RTCContextProvider({children}:{
    children: React.ReactNode
}) {
    const rtcRef = React.useRef<RTCPeerConnection|null>(null);
    const [dataChannel,setDataChannel] = React.useState<RTCDataChannel|null>(null);
    const [remoteStream,setRemoteStream] = React.useState<MediaStream|null>(null);
    const [role,setRole] = React.useState<Role>(null);
    
    // create connection should take media stream item from local webcam
    const createConnection = (localStream:MediaStream) => {
        const pc = new RTCPeerConnection({
            iceServers: [
                {
                    urls: ["stun:stun.l.google.com:19302","stun:stun2.l.google.com:19302"]
                }
            ],
            iceCandidatePoolSize: 10
        });

        // push tracks from local stream to peer connection
        localStream.getTracks().forEach((track) => {
            pc.addTrack(track,localStream);
        });

        // pull tracks from remote stream, add to video connection
        pc.ontrack = (event) => {
            const stream = event.streams[0] ?? new MediaStream([event.track]);
            setRemoteStream(stream);
        };

        rtcRef.current = pc;
        return pc;
    }

    const handleOffer = async(roomId:string) => {
        if (!rtcRef.current) return;
        
        const pc = rtcRef.current;
        const roomRef = doc(db,"rooms",roomId);
        setDataChannel(rtcRef.current.createDataChannel("photobooth"));

        // ice candidate of host
        pc.onicecandidate = async(event) => {
            event.candidate && await updateDoc(roomRef, {
                offerCandidates: event.candidate.toJSON()  
            })
        }
        
        const offerDescription = await pc.createOffer();
        await pc.setLocalDescription(offerDescription);

        // firebase call
        await updateDoc(roomRef, {
            offer: {
                sdp: offerDescription.sdp,
                type: offerDescription.type
            }
        });
        
        // listens to GUEST answer only
        onSnapshot(roomRef,(snapshot) => {
            // listen to answer via snapshot event in firebase
            const data = snapshot.data();
            if (!pc.currentRemoteDescription && data?.answer){
                const answerDescription = new RTCSessionDescription(data?.answer);
                pc.setRemoteDescription(answerDescription);
            } 
        });

        // listens to GUEST ice candidate information 
        onSnapshot(roomRef,(snapshot) => {
            const data = snapshot.data();
            if (data?.answer && data?.answerCandidates){
                pc.addIceCandidate(new RTCIceCandidate(data?.answerCandidates));
            }
        });

        rtcRef.current = pc;
        return pc;
    }

    const handleAnswer = async(roomId:string) => {
        if (!rtcRef.current) return;
        const pc = rtcRef.current;
        const roomRef = doc(db,"rooms",roomId);
        const snapshot = await getDoc(roomRef);
        const roomData = snapshot.data();

        rtcRef.current.ondatachannel = (event) => {
            setDataChannel(event.channel);
        }

        pc.onicecandidate = async(event) => {
            event.candidate && await updateDoc(roomRef,{
                answerCandidates: event.candidate.toJSON()
            }); 
        };

        // call the data from firebase to get the offer
        const offerDescription = roomData?.offer;
        await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

        const answerDescription = await pc.createAnswer();
        await pc.setLocalDescription(answerDescription);

        await updateDoc(roomRef, {
            answer: {
                sdp: answerDescription.sdp,
                type: answerDescription.type
            }
        });

        onSnapshot(roomRef,async(snapshot) => {
            const data = snapshot.data();
            if (data?.offer && data?.offerCandidates) {
                pc.addIceCandidate(new RTCIceCandidate(data?.offerCandidates));
            }
        });
    }

    return (
        <RTCContext.Provider value={{rtcRef,
                                    dataChannel,setDataChannel,
                                    createConnection,
                                    remoteStream,setRemoteStream,
                                    role,setRole,
                                    handleOffer,handleAnswer}}>
            {children}
        </RTCContext.Provider>
    )
}

export const useRTC = () => useContext(RTCContext);