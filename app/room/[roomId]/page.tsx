import { db } from "@/lib/firebase";
import RoomContent from "./_components/room-content";
import { doc, getDoc } from "firebase/firestore";
import { redirect } from "next/navigation";

interface PageProps {
    params: Promise<{roomId: string}>;
}

export default async function RoomId({params}:PageProps) {
    const { roomId } = await params;
    const updatedRoomId = roomId.toUpperCase();
    const roomRef = doc(db,"rooms",updatedRoomId);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()){
        redirect("/?error=room-not-found");
    }

    return (
    <div className="flex flex items-center justify-center gap-24">
        <RoomContent roomId={updatedRoomId}/>
    </div>
    )
}