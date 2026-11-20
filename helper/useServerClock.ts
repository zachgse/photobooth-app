
"use client";

import { useCallback, useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase";

export function useServerClock() {
    const [offset, setOffset] = useState<number | null>(null);

    useEffect(() => {
        const offsetRef = ref(rtdb, ".info/serverTimeOffset");

        const unsubscribe = onValue(offsetRef, (snapshot) => {
            const serverOffset = snapshot.val();

            console.log("SERVER CLOCK OFFSET UPDATED", {
                localTime: Date.now(),
                offset: serverOffset,
                estimatedServerTime:
                    typeof serverOffset === "number"
                        ? Date.now() + serverOffset
                        : null,
                isSynced: typeof serverOffset === "number"
            });

            if (typeof serverOffset === "number") {
                setOffset(serverOffset);
            }
        });

        return () => unsubscribe();
    }, []);

    const getServerTime = useCallback(() => {
        if (offset === null) return null;

        return Date.now() + offset;
    }, [offset]);

    return {
        offset,
        isSynced: offset !== null,
        getServerTime,
    };
}
