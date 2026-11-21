"use client";

import { useEffect, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";
import { rtdb } from "@/lib/firebase";

const SYNC_SETTLE_TIME = 1500;

export function useServerClock() {
    const [offset, setOffset] = useState<number | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isSynced, setIsSynced] = useState(false);

    const connectedRef = useRef(false);
    const offsetRef = useRef<number | null>(null);

    useEffect(() => {
        let syncTimer: ReturnType<typeof setTimeout> | null = null;

        const scheduleSync = () => {
            if (!connectedRef.current || offsetRef.current === null) {
                return;
            }

            setIsSynced(false);

            if (syncTimer) clearTimeout(syncTimer);

            syncTimer = setTimeout(() => {
                if (connectedRef.current && offsetRef.current !== null) {
                    setIsSynced(true);
                }
            }, SYNC_SETTLE_TIME);
        };

        const unsubscribeConnection = onValue(
            ref(rtdb, ".info/connected"),
            (snapshot) => {
                const connected = snapshot.val() === true;

                connectedRef.current = connected;
                setIsConnected(connected);

                if (!connected) {
                    setIsSynced(false);

                    if (syncTimer) {
                        clearTimeout(syncTimer);
                        syncTimer = null;
                    }
                } else {
                    scheduleSync();
                }
            }
        );

        const unsubscribeOffset = onValue(
            ref(rtdb, ".info/serverTimeOffset"),
            (snapshot) => {
                const value = snapshot.val();

                const valid =
                    typeof value === "number" &&
                    Number.isFinite(value);

                offsetRef.current = valid ? value : null;
                setOffset(offsetRef.current);

                if (valid) {
                    scheduleSync();
                } else {
                    setIsSynced(false);

                    if (syncTimer) {
                        clearTimeout(syncTimer);
                        syncTimer = null;
                    }
                }
            }
        );

        return () => {
            unsubscribeConnection();
            unsubscribeOffset();

            if (syncTimer) clearTimeout(syncTimer);
        };
    }, []);

    const getServerTime = () => {
        if (!isConnected || !isSynced || offset === null) {
            return null;
        }

        return Date.now() + offset;
    };

    return {
        offset,
        isConnected,
        isSynced,
        getServerTime,
    };
}
