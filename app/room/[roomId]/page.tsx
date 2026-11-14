import { doc,getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import RoomContent from "./_components/room-content";

interface PageProps {
    params: Promise<{roomId: string}>;
}

export default async function RoomId({params}:PageProps) {
    const { roomId } = await params;

    return (
    <div className="flex flex items-center justify-center gap-24">
        <RoomContent roomId={roomId}/>
    </div>
    )
}