
"use client";

import { useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface CaptureEvent {
    id: string;
    captureAt: number;
}

interface Props {
    roomId: string;
    getServerTime: () => number | null;
    capture: () => void | Promise<void>;
    onCountdownChange: (time: number | null) => void;
}

export function useCaptureSync({
    roomId,
    getServerTime,
    capture,
    onCountdownChange
}: Props) {
    const lastCaptureId = useRef<string | null>(null);
    const captureRef = useRef(capture);
    const serverTimeRef = useRef(getServerTime);
    const onCountdownRef = useRef(onCountdownChange);

    useEffect(() => {
        onCountdownRef.current = onCountdownChange;
    }, [onCountdownChange]);

    useEffect(() => {
        captureRef.current = capture;
    }, [capture]);

    useEffect(() => {
        serverTimeRef.current = getServerTime;
    }, [getServerTime]);

    useEffect(() => {
        const roomRef = doc(db, "rooms", roomId);

        let initialSnapshot = true;
        let timeout: ReturnType<typeof setTimeout> | null = null;

        const unsubscribe = onSnapshot(roomRef, (snapshot) => {
            const event = snapshot.data()?.captureEvent as
                | CaptureEvent
                | undefined;

            if (initialSnapshot) {
                initialSnapshot = false;

                if (event?.id) {
                    lastCaptureId.current = event.id;
                }

                return;
            }

            if (!event?.id || !event.captureAt) return;

            if (event.id === lastCaptureId.current) return;

            lastCaptureId.current = event.id;

            if (timeout) clearTimeout(timeout);

            const scheduleCapture = () => {
                const serverNow = serverTimeRef.current();

                if (serverNow === null) {
                    timeout = setTimeout(scheduleCapture, 100);
                    return;
                }

                const remaining = event.captureAt - serverNow;

                if (remaining <= 0) {
                    onCountdownRef.current(null);
                    captureRef.current();
                    return;
                }

                onCountdownRef.current(Math.ceil(remaining / 1000));

                timeout = setTimeout(scheduleCapture, 100);
            };

            scheduleCapture();
        });

        return () => {
            unsubscribe();

            if (timeout) clearTimeout(timeout);
        };
    }, [roomId]);
}
