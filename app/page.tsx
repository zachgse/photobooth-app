"use client"

import { generateRoomId } from "./helper/utils"

export default function Index() {
    const startPhotobooth = async() => {
        const roomId = generateRoomId();
    }
    

    return (
        <div>
            <button onClick={startPhotobooth} className="py-4 px-12 bg-blue-500 text-white text-center">Generate room</button>
        </div>
    )
}