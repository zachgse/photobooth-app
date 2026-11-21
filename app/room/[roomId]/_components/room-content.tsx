
"use client";

import React from "react";
import Webcam from "react-webcam";
import { useRTC } from "@/app/context/RTCContext";
import { Timer } from "./timer";
import { generatePhotoboothStrip } from "./generate-photo";
import { captureScreenshot } from "@/helper/utils";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useServerClock } from "@/helper/useServerClock";
import { db } from "@/lib/firebase";
import { useCaptureSync } from "@/helper/useCaptureSync";
import clsx from "clsx";
import { LiaUndoAltSolid } from "react-icons/lia";
import { FaCamera } from "react-icons/fa";
import { toast } from "react-toastify";

interface RoomContentProps {
    roomId: string;
}

export interface CapturedPair {
    localPic: string;
    remotePic: string;
}

interface ClockSync {
    host: boolean;
    guest: boolean;
}

const TOAST_ID = "photobooth-preparation";
const PHOTO_TIME = 4000;

export default function RoomContent({ roomId }: RoomContentProps) {
    const roomRef = doc(db, "rooms", roomId);
    const context = useRTC();

    const webcamRef = React.useRef<Webcam | null>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);

    const [time, setTime] = React.useState<number | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [images, setImages] = React.useState<CapturedPair[]>([]);
    const [generatedStrip, setGeneratedStrip] = React.useState<string | null>(null);
    const [clockSync, setClockSync] = React.useState<ClockSync | null>(null);

    const { isSynced, getServerTime } = useServerClock();

    const canCapture =
        isSynced &&
        clockSync?.host === true &&
        clockSync?.guest === true;

    // Keep your existing role fallback behavior
    React.useEffect(() => {
        if (context && !context.role) {
            context.role = "guest";
        }
    }, []);

    // WEBRTC
    const handleUserMedia = async (stream: MediaStream) => {
        context?.createConnection(stream);

        if (context?.role === "host") {
            context.handleOffer(roomId);
        } else {
            context?.handleAnswer(roomId);
        }
    };

    // CAPTURE EVENT
    const handleCapture = async () => {
        if (!canCapture || loading) return;

        const serverNow = getServerTime();

        if (serverNow === null) {
            console.warn("CAPTURE ABORTED: Server clock unavailable");
            return;
        }

        const captureAt = serverNow + PHOTO_TIME;
        const captureEventId = crypto.randomUUID();

        setLoading(true);

        const writeStartedAt = Date.now();

        console.log("CAPTURE WRITE STARTED", {
            eventId: captureEventId,
            role: context?.role,
            localTime: writeStartedAt,
            serverTime: serverNow,
            captureAt,
            photoTime: PHOTO_TIME,
            isSynced,
            canCapture
        });

        try {
            await updateDoc(roomRef, {
                captureEvent: {
                    id: captureEventId,
                    captureAt
                }
            });

            const writeAcknowledgedAt = Date.now();

            console.log("CAPTURE WRITE ACKNOWLEDGED", {
                eventId: captureEventId,
                localTime: writeAcknowledgedAt,
                serverTime: getServerTime(),
                duration: writeAcknowledgedAt - writeStartedAt
            });

        } catch (error) {
            console.error("CAPTURE WRITE FAILED", {
                eventId: captureEventId,
                localTime: Date.now(),
                duration: Date.now() - writeStartedAt,
                error
            });

            setLoading(false);
            toast.error("Unable to start capture. Please try again.");
        }
    };


    // CAPTURE PHOTO
    const capturePhoto = React.useCallback(async () => {
        const video = videoRef.current;

        console.log("CAPTURING PHOTO", {
            localTime: Date.now(),
            serverTime: getServerTime(),
            remoteVideo: {
                readyState: video?.readyState,
                videoWidth: video?.videoWidth,
                videoHeight: video?.videoHeight,
                paused: video?.paused
            }
        });

        try {
            const localPic = webcamRef.current?.getScreenshot();
            const remotePic = captureScreenshot(video);

            if (!localPic || !remotePic) {
                console.error("PHOTO CAPTURE FAILED", {
                    localPicAvailable: !!localPic,
                    remotePicAvailable: !!remotePic,
                    remoteReadyState: video?.readyState,
                    remoteVideoWidth: video?.videoWidth,
                    remoteVideoHeight: video?.videoHeight
                });

                return;
            }

            setImages((prev) => [
                ...prev,
                {
                    localPic,
                    remotePic
                }
            ]);
        } catch (error) {
            console.error("PHOTO CAPTURE ERROR", error);
        } finally {
            setLoading(false);
        }
    }, [getServerTime]);

    // GENERATE PHOTO STRIP
    const handleGenerate = async (photos: CapturedPair[]) => {
        try {
            const strip = await generatePhotoboothStrip({
                photos
            });

            setGeneratedStrip(strip);
        } catch (error) {
            console.error("PHOTO STRIP GENERATION ERROR", error);
            toast.error("Unable to generate your photobooth strip.");
        }
    };

    // APPLY RETAKE LOCALLY ONLY
    const applyRetake = React.useCallback(() => {
        setImages((prev) => prev.slice(0, -1));
    }, []);

    // LOCAL RETAKE: PUBLISH EVENT + APPLY LOCALLY
    const handleRetake = async () => {
        if (images.length < 1 || loading) return;

        const retakeEventId = crypto.randomUUID();
        const writeStartedAt = Date.now();

        console.log("RETAKE WRITE STARTED", {
            eventId: retakeEventId,
            role: context?.role ?? "guest",
            localTime: writeStartedAt,
            serverTime: getServerTime(),
            imagesCount: images.length
        });

        try {
            await updateDoc(roomRef, {
                retakeEvent: {
                    id: retakeEventId,
                    initiatedBy: context?.role ?? "guest"
                }
            });

            const writeAcknowledgedAt = Date.now();

            console.log("RETAKE WRITE ACKNOWLEDGED", {
                eventId: retakeEventId,
                localTime: writeAcknowledgedAt,
                serverTime: getServerTime(),
                duration: writeAcknowledgedAt - writeStartedAt
            });

            applyRetake();

        } catch (error) {
            console.error("RETAKE WRITE FAILED", {
                eventId: retakeEventId,
                localTime: Date.now(),
                duration: Date.now() - writeStartedAt,
                error
            });

            toast.error("Unable to retake the last photo.");
        }
    };


    // REMOTE VIDEO STREAM
    React.useEffect(() => {
        const video = videoRef.current;

        if (!video || !context?.remoteStream) return;

        video.srcObject = context.remoteStream;

        video.play().catch((error) => {
            console.error("REMOTE VIDEO PLAY ERROR", error);
        });
    }, [context?.remoteStream]);

    // PUBLISH CLOCK READINESS
    React.useEffect(() => {
        const updateReadiness = async () => {
            const role = context?.role;

            if (!role) return;

            await updateDoc(roomRef, {
                [`clockSync.${role}`]: isSynced
            });
        };

        updateReadiness().catch((error) => {
            console.error("CLOCK READINESS UPDATE ERROR", error);
        });
    }, [roomId, context?.role, isSynced]);

    // SUBSCRIBE TO BOTH PARTICIPANTS' CLOCK READINESS
    React.useEffect(() => {
        toast.info("Preparing the photobooth...", {
            toastId: TOAST_ID,
            position: "top-center",
            autoClose: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            theme: "light"
        });

        const unsubscribe = onSnapshot(
            roomRef,
            (snapshot) => {
                if (!snapshot.exists()) return;

                const sync = snapshot.data().clockSync ?? null;

                setClockSync(sync);

                const ready =
                    sync?.host === true &&
                    sync?.guest === true;

                if (ready) {
                    toast.update(TOAST_ID, {
                        render: "Photobooth is ready!",
                        type: "success",
                        autoClose: 2000,
                        closeOnClick: true
                    });
                } else {
                    toast.update(TOAST_ID, {
                        render: "Synchronizing clocks...",
                        type: "info",
                        autoClose: false
                    });
                }
            },
            (error) => {
                console.error("CLOCK READINESS SNAPSHOT ERROR", error);
            }
        );

        return () => {
            unsubscribe();
            toast.dismiss(TOAST_ID);
        };
    }, [roomId]);

    // GENERATE STRIP AFTER FOUR PHOTOS
    React.useEffect(() => {
        if (images.length === 4) {
            handleGenerate(images);
        }
    }, [images]);

    // CAPTURE AND RETAKE SYNCHRONIZATION
    useCaptureSync({
        roomId,
        role: context?.role ?? "guest",
        getServerTime,
        capture: capturePhoto,
        onCountdownChange: setTime,
        onRetake: applyRetake
    });

    return (
        !generatedStrip ? (
            <div className="relative w-full min-h-dvh flex flex-col items-center justify-center px-4 gap-8">

                {/* MAIN CAMERA AREA */}
                <div className="w-full lg:w-3/5 md:w-4/5 grid grid-cols-2 relative">
                    <div className="relative aspect-[3/3]">
                        <Webcam
                            mirrored
                            audio={false}
                            videoConstraints={{ facingMode: "user" }}
                            screenshotFormat="image/jpeg"
                            ref={webcamRef}
                            onUserMedia={handleUserMedia}
                            className="w-full h-full object-cover rounded-r-xl"
                        />
                    </div>

                    <div className="relative aspect-[3/3]">
                        {context?.remoteStream ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover -scale-x-100 rounded-l-xl"
                            />
                        ) : (
                            <div className="bg-gray-300 w-full h-full flex items-center justify-center rounded-r-xl">
                                <p>No video yet.</p>
                            </div>
                        )}
                    </div>

                    {/* COUNTDOWN */}
                    {time !== null && <Timer time={time} />}
                </div>

                {/* PHOTO PREVIEWS */}
                {images.length >= 1 && (
                    <div className="
                        relative
                        w-full
                        grid grid-cols-2
                        gap-2 px-8 mt-4

                        md:grid-cols-1
                        md:absolute
                        md:-mt-0
                        md:px-0
                        md:w-64
                        md:right-8
                        md:top-1/2
                        md:-translate-y-1/2
                    ">
                        {images.map((image, i) => (
                            <div
                                key={i}
                                className="flex flex-col gap-1 items-center justify-center"
                            >
                                <div className="flex items-center justify-center gap-0 w-full">
                                    <img
                                        src={image.localPic}
                                        alt={`Local Picture preview ${i + 1}`}
                                        className="w-1/2 h-40"
                                    />

                                    <img
                                        src={image.remotePic}
                                        alt={`Remote Picture preview ${i + 1}`}
                                        className="w-1/2 h-40"
                                    />
                                </div>

                                <p className="w-10 h-10 rounded-full border border-black flex items-center justify-center">
                                    {i + 1}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* CONTROLS */}
                {canCapture && (
                    <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
                        <button
                            onClick={handleRetake}
                            disabled={images.length < 1 || loading}
                            className={clsx(
                                "border border-black px-12 py-4 rounded-lg flex items-center justify-center gap-2",
                                images.length < 1 || loading
                                    ? "opacity-70 cursor-not-allowed"
                                    : "cursor-pointer"
                            )}
                        >
                            <LiaUndoAltSolid />
                            Retake last preview
                        </button>

                        <button
                            onClick={handleCapture}
                            disabled={loading}
                            className={clsx(
                                "bg-black px-12 py-4 text-white rounded-lg flex items-center justify-center gap-2",
                                loading
                                    ? "opacity-70 cursor-not-allowed"
                                    : "cursor-pointer"
                            )}
                        >
                            <FaCamera />
                            {loading ? "Capturing" : "Capture"}
                        </button>
                    </div>
                )}
            </div>
        ) : (
            <div className="w-full min-h-dvh flex items-center justify-center">
                <img
                    src={generatedStrip}
                    alt="Generated photobooth strip"
                    className="w-full max-w-xs"
                />
            </div>
        )
    );
}
