
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

            console.log("FIRESTORE SNAPSHOT RECEIVED", {
                localTime: Date.now(),
                serverTime: serverTimeRef.current(),
                fromCache: snapshot.metadata.fromCache,
                hasPendingWrites: snapshot.metadata.hasPendingWrites,
                event
            });

            if (initialSnapshot) {
                initialSnapshot = false;

                if (event?.id) {
                    lastCaptureId.current = event.id;
                }

                console.log("INITIAL SNAPSHOT", {
                    eventId: event?.id,
                    skipped: true
                });

                return;
            }

            if (!event?.id || !event.captureAt) return;

            if (event.id === lastCaptureId.current) return;

            lastCaptureId.current = event.id;

            if (timeout) clearTimeout(timeout);

            // Log when a new capture event arrives
            console.log("NEW CAPTURE EVENT RECEIVED", {
                localTime: Date.now(),
                serverTime: serverTimeRef.current(),
                captureAt: event.captureAt,
                remaining:
                    event.captureAt - (serverTimeRef.current() ?? 0)
            });

            let firstSchedule = true;

            const scheduleCapture = () => {
                const serverNow = serverTimeRef.current();

                if (serverNow === null) {
                    timeout = setTimeout(scheduleCapture, 100);
                    return;
                }

                const remaining = event.captureAt - serverNow;

                if (firstSchedule) {
                    console.log("CAPTURE SCHEDULING STARTED", {
                        localTime: Date.now(),
                        serverNow,
                        captureAt: event.captureAt,
                        remaining
                    });

                    firstSchedule = false;
                }

                if (remaining <= 0) {
                    console.log("CAPTURE TIMER FINISHED", {
                        localTime: Date.now(),
                        serverNow,
                        captureAt: event.captureAt,
                        drift: serverNow - event.captureAt
                    });

                    onCountdownRef.current(null);
                    captureRef.current();
                    return;
                }

                onCountdownRef.current(Math.ceil(remaining / 1000));

                timeout = setTimeout(scheduleCapture, 100);
            };

            scheduleCapture();
        }, (error) => {
            console.error("CAPTURE SNAPSHOT ERROR", error);
        });

        return () => {
            unsubscribe();

            if (timeout) clearTimeout(timeout);
        };
    }, [roomId]);
}
