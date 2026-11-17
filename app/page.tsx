"use client"

import React from "react"
import { setDoc,doc } from "firebase/firestore"
import { generateRoomId } from "@/helper/utils"
import { db } from "@/lib/firebase"
import { toast } from "react-toastify"
import { useRTC } from "./context/RTCContext"
import { useRouter } from "next/navigation"

export default function Index() {
    const context = useRTC();
    const router = useRouter();
    const [codeInput,setCodeInput] = React.useState<string>("");

    const startPhotobooth = async() => {
        try {
            const roomId = generateRoomId();
            const roomRef = doc(db, "rooms", roomId);

            await setDoc(roomRef, {
                createdAt: new Date(),
            });

            context?.setRole("host");

            toast.info('Creating your room', {
                position: "top-center",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light"});

            setTimeout(() => {
                router.push(`/room/${roomId}`);
            },3000)
        } catch (error) {
            console.error(error);
        }
    }

    const joinPhotobooth = () => { 
        context?.setRole("guest");
        router.push(`/room/${codeInput}`);
    }

    return (
            <div className="h-screen flex flex-col gap-4 items-center justify-center ">
                <div className="flex md:flex-row flex-col gap-12 md:w-3/5 w-4/5 mx-auto">
                    <div onClick={startPhotobooth} className="border-1 rounded-2xl w-full h-auto p-8 cursor-pointer hover:border-blue-500 hover:text-blue-500">
                        <p className="text-3xl font-bold">Start photobooth</p> <br />
                        Invite a friend with shared link and snap side-by-side
                    </div>
                    <div className="border-1 rounded-2xl w-full p-8 flex flex-col">
                        <p className="text-3xl font-bold">Got a code?</p> <br />
                        <div className="flex md:flex-row flex-col items-center gap-4">
                            <input type="text" className="border-1 border-gray-300 bg-gray-100 px-2 py-4 rounded-2xl" placeholder="Enter code"
                                value={codeInput}
                                onChange={(e)=>setCodeInput(e.target.value)}
                                />
                            <button onClick={joinPhotobooth}
                                className="border-1 bg-black text-white px-12 py-4 rounded-2xl cursor-pointer hover:opacity-80">
                                JOIN
                            </button>
                        </div>
                    </div>
                </div>
            </div>
    )
}