"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
} from "react";

interface RTCConnection { //interface is needed to infer the type/shape of RTCConnection
    rtcRef: React.RefObject<RTCPeerConnection | null>;
    // connectionState: RTCPeerConnectionState;
    // createOffer: () => Promise<void>;
    // handleOffer: (offer: RTCSessionDescriptionInit) => Promise<void>;
    // handleAnswer: (answer: RTCSessionDescriptionInit) => Promise<void>;
}

const RTCContext = createContext<RTCConnection | null>(null);

export function RTCContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const rtcRef = useRef<RTCPeerConnection | null>(null);

  const [connectionState, setConnectionState] =
    useState<RTCPeerConnectionState>("new");

  const value: RTCConnection = {
    rtcRef,
    // connectionState,
    // createOffer,
    // handleOffer,
    // handleAnswer
  };

  return (
    <RTCContext.Provider value={value}>
      {children}
    </RTCContext.Provider>
  );
}

// export function useRTC() { //custom hook to use the rtcConnection Context
//   const context = useContext(RTCContext);

//   if (!context) {
//     throw new Error("useRTC must be used within RTCContextProvider");
//   }

//   return context;
// }