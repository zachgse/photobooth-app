"use client"

import React from "react"
import { setDoc,doc, getDoc } from "firebase/firestore"
import { generateRoomId } from "@/helper/utils"
import { db } from "@/lib/firebase"
import { useRTC } from "../context/RTCContext"
import { useRouter } from "next/navigation"
import { customToast, TOAST_IDS } from "../components/toast"

export default function Index() {
    const context = useRTC();
    const router = useRouter();
    const [codeInput,setCodeInput] = React.useState<string>("");

    const startPhotobooth = async() => {
        try {
            customToast.info("Creating photobooth room", {
                toastId: TOAST_IDS.CREATE,
                autoClose: false
            });
            const roomId = generateRoomId();
            const roomRef = doc(db, "rooms", roomId);

            await setDoc(roomRef, {
                createdAt: new Date(),
            });

            context?.setRole("host");

            router.push(`/room/${roomId}`);

            customToast.dismiss(TOAST_IDS.CREATE);
        } catch (error) {
            console.error(error);
            customToast.error("Photobooth error. Try again later.", {
                toastId: TOAST_IDS.CREATE,
                autoClose: 3000
            });
        }
    }

    const joinPhotobooth = async() => { 
        const roomId = codeInput.toUpperCase();
        const roomRef = doc(db,"rooms",roomId);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
            customToast.error("Room does not exist", {
                toastId: TOAST_IDS.CREATE,
                autoClose: 3000
            });    
            setCodeInput("");
            return;
        } 

        customToast.info("Joining photobooth room", {
            toastId: TOAST_IDS.CREATE,
            autoClose: false
        });
        context?.setRole("guest");
        router.push(`/room/${codeInput}`);
        customToast.dismiss(TOAST_IDS.CREATE);
    }

    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const error = params.get("error");

        if (error === "room-not-found") {
            customToast.error("Room does not exist!",{
                toastId: TOAST_IDS.CREATE,
                autoClose: 3000
            });
            router.replace("/");
        }
    }, [router]);

    return (
            <div className="w-full min-h-dvh flex flex-col gap-4 items-center justify-center ">
                <div className="flex md:flex-row flex-col gap-12 md:w-3/5 w-4/5 mx-auto">
                    <div onClick={startPhotobooth} className="bg-white border-1 rounded-2xl w-full h-auto p-8 cursor-pointer hover:border-blue-500 hover:text-blue-500">
                        <p className="text-3xl font-bold">Start photobooth</p> <br />
                        Invite a friend with shared link and snap side-by-side
                    </div>
                    <div className="bg-white border-1 rounded-2xl w-full p-8 flex flex-col">
                        <p className="text-3xl font-bold">Got a code?</p> <br />
                        <div className="flex md:flex-row flex-col items-center gap-4">
                            <input type="text" className="border-1 border-gray-300 bg-gray-100 px-2 py-4 rounded-2xl uppercase" placeholder="Enter code"
                                value={codeInput}
                                maxLength={6}
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