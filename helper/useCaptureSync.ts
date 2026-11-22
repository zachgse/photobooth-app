"use client";

import { useEffect, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { customToast, TOAST_IDS } from "@/components/toast";

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
    onLoading: (value:boolean) => void;
}

export function useCaptureSync({
    roomId,
    role,
    getServerTime,
    capture,
    onCountdownChange,
    onRetake,
    onLoading
}: Props) {
    const lastCaptureId = useRef<string | null>(null);
    const lastRetakeId = useRef<string | null>(null);

    const captureRef = useRef(capture);
    const serverTimeRef = useRef(getServerTime);
    const onCountdownRef = useRef(onCountdownChange);
    const onRetakeRef = useRef(onRetake);
    const onLoadingRef = useRef(onLoading);

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
        onLoadingRef.current = onLoading;
    }, [onLoading]);

    useEffect(() => {
        const roomRef = doc(db, "rooms", roomId);

        let initialSnapshot = true;
        let timeout: ReturnType<typeof setTimeout> | null = null;
        let cancelSchedule: (() => void) | null = null;

        const unsubscribe = onSnapshot(
            roomRef,
            {includeMetadataChanges:true},
            (snapshot) => {
                const data = snapshot.data();

                const event = data?.captureEvent as
                    | CaptureEvent
                    | undefined;

                const retakeEvent = data?.retakeEvent as
                    | RetakeEvent
                    | undefined;

                if (initialSnapshot) {
                    if (event?.id) {
                        lastCaptureId.current = event.id;
                    }

                    if (retakeEvent?.id) {
                        lastRetakeId.current = retakeEvent.id;
                    }

                    initialSnapshot = false;

                    return;
                }

                if (
                    retakeEvent?.id &&
                    retakeEvent.id !== lastRetakeId.current
                ) {
                    lastRetakeId.current = retakeEvent.id;

                    onLoadingRef.current(true);

                    if (retakeEvent.initiatedBy !== role) {
                        void Promise.resolve(
                            onRetakeRef.current()
                        ).catch(console.error);
                    }

                    onLoadingRef.current(false);

                    customToast.success("Retake previous photo",{
                        toastId:TOAST_IDS.RETAKE,
                        autoClose:2000
                    });
                }

                if (!event?.id || !event.captureAt) return;

                if (event.id === lastCaptureId.current) return;

                lastCaptureId.current = event.id;

                cancelSchedule?.();

                let cancelled = false;
                let captureStarted = false;
                let firstSchedule = true;

                onLoadingRef.current(true);

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

                    if (serverNow === null) {
                        timeout = setTimeout(scheduleCapture, 100);
                        return;
                    }

                    const remaining = event.captureAt - serverNow;

                    if (firstSchedule) {
                        firstSchedule = false;
                    }

                    if (remaining <= 0) {
                        captureStarted = true;

                        onCountdownRef.current(null);

                        void Promise.resolve(
                            captureRef.current()
                        ).catch(console.error);
                        onLoadingRef.current(false);
                        return;
                    }

                    onCountdownRef.current(
                        Math.ceil(remaining / 1000)
                    );

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
