
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
