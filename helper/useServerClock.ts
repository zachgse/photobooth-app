
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { onValue, ref } from "firebase/database";
import { rtdb } from "@/lib/firebase";

const SYNC_SETTLE_TIME = 1500;

export function useServerClock() {
    const [offset, setOffset] = useState<number | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isSynced, setIsSynced] = useState(false);

    const connectedRef = useRef(false);
    const offsetRef = useRef<number | null>(null);

    const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const clearSyncTimer = () => {
            if (syncTimerRef.current) {
                clearTimeout(syncTimerRef.current);
                syncTimerRef.current = null;
            }
        };

        const scheduleSync = () => {
            if (
                !connectedRef.current ||
                offsetRef.current === null
            ) {
                return;
            }

            clearSyncTimer();
            setIsSynced(false);

            syncTimerRef.current = setTimeout(() => {
                if (
                    connectedRef.current &&
                    offsetRef.current !== null
                ) {
                    setIsSynced(true);
                }

                syncTimerRef.current = null;
            }, SYNC_SETTLE_TIME);
        };

        const unsubscribeConnection = onValue(
            ref(rtdb, ".info/connected"),
            (snapshot) => {
                const connected = snapshot.val() === true;

                connectedRef.current = connected;
                setIsConnected(connected);

                if (!connected) {
                    clearSyncTimer();
                    setIsSynced(false);
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
                    clearSyncTimer();
                    setIsSynced(false);
                }
            }
        );

        return () => {
            unsubscribeConnection();
            unsubscribeOffset();
            clearSyncTimer();
        };
    }, []);

    const getServerTime = useCallback(() => {
        if (
            !connectedRef.current ||
            offsetRef.current === null
        ) {
            return null;
        }

        return Date.now() + offsetRef.current;
    }, []);

    return {
        offset,
        isConnected,
        isSynced,
        getServerTime,
    };
}
