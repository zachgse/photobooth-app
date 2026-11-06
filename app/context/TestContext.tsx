"use client"
import React, { createContext,useContext,useRef, useState } from "react";

interface Shape {
    name: string;
    setName: (value: string) => void;
}

export const TestContext = createContext<Shape|null>(null);

export function TestContextProvider({children}:{
    children: React.ReactNode
}) {
    const [name,setName] = useState("");

    return (
        <TestContext.Provider value={{name,setName}}>
            {children}
        </TestContext.Provider>
    )
}

export const useTest = () => useContext(TestContext);


// export function Rtc() {
//     // const rtcRef = useRef<RTCPeerConnection|null>(null);

// }