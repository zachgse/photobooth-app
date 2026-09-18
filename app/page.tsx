"use client"

import { collection,addDoc } from "firebase/firestore"
import { generateRoomId } from "@/helper/utils"
import { db } from "@/lib/firebase"
import { toast } from "react-toastify"

export default function Index() {
    const startPhotobooth = async() => {
        try {
            const roomId = generateRoomId();
            const rtc = new RTCPeerConnection();
            const offer = await rtc.createOffer();
            await rtc.setLocalDescription(offer);
            const roomRef = await addDoc(collection(db,"rooms"), {
                createdAt: new Date(),
                host: true,
                offer: {
                    type: offer.type,
                    sdp: offer.sdp

                }
            });
            console.log(roomRef);
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
                window.location.href = `/room/${roomId}`;
            },3000)
        } catch (error) {
            console.error(error);
        }
    }

    const joinPhotobooth = async() => { 
        /*  
        1. put code in the form
        2. check in firebase backend if the code exist 
        3. if yes > redirect to /room/{code} while sending a request to firebase with same roomId and append guest:true in json
        */
    }
    
    return (
        <div className="h-screen flex flex-col gap-4 items-center justify-center ">
            <div className="flex md:flex-row flex-col gap-12 md:w-3/5 w-4/5 mx-auto">
                <div onClick={startPhotobooth} className="border-1 rounded-2xl w-full h-auto p-8 cursor-pointer hover:border-blue-500 hover:text-blue-500">
                    <p className="text-3xl font-bold">Start photobooth</p> <br />
                    Invite a friend with shared link and snap side-by-side
                </div>
                <div className="border-1 rounded-2xl w-full h-auto p-8">
                    <p className="text-3xl font-bold">Got a code?</p> <br />
                    <div className="flex items-center gap-4">
                        <input type="text" className="border-1 border-gray-300 bg-gray-100 px-2 py-4 rounded-2xl" placeholder="Enter code"/>
                        <button className="border-1 border-blue-500 bg-blue-100 px-12 py-4 rounded-2xl text-blue-500 cursor-pointer hover:bg-blue-500 hover:text-white">
                            JOIN
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}