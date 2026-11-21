
"use client";

import { useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Role = "host" | "guest";

interface CaptureEvent {
    id: string;
    captureAt: number;
}

interface RetakeEvent {
    id: string;
    initiatedBy: Role;
}

interface Props {
    roomId: string;
    role: Role;
    getServerTime: () => number | null;
    capture: () => void | Promise<void>;
    onCountdownChange: (time: number | null) => void;
    onRetake: () => void | Promise<void>;
}

export function useCaptureSync({
    roomId,
    role,
    getServerTime,
    capture,
    onCountdownChange,
    onRetake
}: Props) {
    const lastCaptureId = useRef<string | null>(null);
    const lastRetakeId = useRef<string | null>(null);

    const captureRef = useRef(capture);
    const serverTimeRef = useRef(getServerTime);
    const onCountdownRef = useRef(onCountdownChange);
    const onRetakeRef = useRef(onRetake);

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
        onRetakeRef.current = onRetake;
    }, [onRetake]);

    useEffect(() => {
        const roomRef = doc(db, "rooms", roomId);

        let initialSnapshot = true;
        let timeout: ReturnType<typeof setTimeout> | null = null;
        let cancelSchedule: (() => void) | null = null;

        const unsubscribe = onSnapshot(
            roomRef,
            (snapshot) => {
                const data = snapshot.data();

                const event = data?.captureEvent as
                    | CaptureEvent
                    | undefined;

                const retakeEvent = data?.retakeEvent as
                    | RetakeEvent
                    | undefined;

                console.log("FIRESTORE SNAPSHOT RECEIVED", {
                    localTime: Date.now(),
                    serverTime: serverTimeRef.current(),
                    fromCache: snapshot.metadata.fromCache,
                    hasPendingWrites: snapshot.metadata.hasPendingWrites,
                    event,
                    retakeEvent
                });

                // INITIAL SNAPSHOT
                if (initialSnapshot) {
                    if (event?.id) {
                        lastCaptureId.current = event.id;
                    }

                    if (retakeEvent?.id) {
                        lastRetakeId.current = retakeEvent.id;
                    }

                    initialSnapshot = false;

                    console.log("INITIAL SNAPSHOT", {
                        eventId: event?.id,
                        retakeEventId: retakeEvent?.id,
                        skipped: true
                    });

                    return;
                }

                // RETAKE EVENT
                if (
                    retakeEvent?.id &&
                    retakeEvent.id !== lastRetakeId.current
                ) {
                    lastRetakeId.current = retakeEvent.id;

                    if (retakeEvent.initiatedBy !== role) {
                        console.log("RETAKE EVENT RECEIVED", {
                            retakeEvent,
                            role
                        });

                        void Promise.resolve(
                            onRetakeRef.current()
                        ).catch(console.error);
                    }
                }

                // CAPTURE EVENT
                if (!event?.id || !event.captureAt) return;

                if (event.id === lastCaptureId.current) return;

                lastCaptureId.current = event.id;

                // Cancel any previous capture schedule
                cancelSchedule?.();

                console.log("NEW CAPTURE EVENT RECEIVED", {
                    localTime: Date.now(),
                    serverTime: serverTimeRef.current(),
                    captureAt: event.captureAt,
                    remaining:
                        event.captureAt -
                        (serverTimeRef.current() ?? 0)
                });

                let cancelled = false;
                let captureStarted = false;
                let firstSchedule = true;

                cancelSchedule = () => {
                    cancelled = true;

                    if (timeout) {
                        clearTimeout(timeout);
                        timeout = null;
                    }
                };

                const scheduleCapture = () => {
                    if (cancelled || captureStarted) return;

                    const serverNow = serverTimeRef.current();

                    // Wait until the server clock is available
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

                    // Capture when the scheduled server time is reached
                    if (remaining <= 0) {
                        captureStarted = true;

                        console.log("CAPTURE TIMER FINISHED", {
                            localTime: Date.now(),
                            serverNow,
                            captureAt: event.captureAt,
                            drift: serverNow - event.captureAt
                        });

                        onCountdownRef.current(null);

                        void Promise.resolve(
                            captureRef.current()
                        ).catch(console.error);

                        return;
                    }

                    onCountdownRef.current(
                        Math.ceil(remaining / 1000)
                    );

                    // Wake up at the next countdown boundary
                    // instead of polling every 100ms
                    const nextCheck = Math.min(
                        remaining,
                        remaining % 1000 || 1000
                    );

                    timeout = setTimeout(
                        scheduleCapture,
                        nextCheck
                    );
                };

                scheduleCapture();
            },
            (error) => {
                console.error("CAPTURE SNAPSHOT ERROR", error);
            }
        );

        return () => {
            cancelSchedule?.();

            if (timeout) {
                clearTimeout(timeout);
            }

            unsubscribe();
        };
    }, [roomId, role]);
}
