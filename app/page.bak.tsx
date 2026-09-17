"use client"

import Image from "next/image";
import React from "react";
import Webcam from "react-webcam";

export default function Home() {
  const webcamRef = React.useRef(null);
  const [imgSrc,setImgSrc] = React.useState(null);
  const [time,setTime] = React.useState<number|null>(null);

  const startCountdown = ()  => {
    setTime(4);
  }

  const capture = async() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImgSrc(imageSrc);
  };

  // const generateStrip = () => {
  //   const canvas = document.createElement("canvas");

  //   canvas.width = 600;
  //   canvas.height = 1800;

  //   const ctx = canvas.getContext("2d");

  //   if (!ctx) return;

  //   // =========================
  //   // Canvas background
  //   // =========================

  //   ctx.fillStyle = "#000000";
  //   ctx.fillRect(0, 0, canvas.width, canvas.height);

  //   // =========================
  //   // Layout
  //   // =========================

  //   const padding = 50;
  //   const gap = 30;

  //   const photoWidth = canvas.width - padding * 2;
  //   const photoHeight = 350;

  //   // =========================
  //   // Photo placeholders
  //   // =========================

  //   for (let i = 0; i < 4; i++) {
  //     const x = padding;
  //     const y = padding + i * (photoHeight + gap);

  //     // Photo background
  //     ctx.fillStyle = "#e5e5e5";
  //     ctx.fillRect(
  //       x,
  //       y,
  //       photoWidth,
  //       photoHeight
  //     );

  //     // Photo border
  //     ctx.strokeStyle = "#bdbdbd";
  //     ctx.lineWidth = 3;
  //     ctx.strokeRect(
  //       x,
  //       y,
  //       photoWidth,
  //       photoHeight
  //     );

  //     // Placeholder text
  //     ctx.fillStyle = "#999999";
  //     ctx.font = "bold 24px sans-serif";
  //     ctx.textAlign = "center";
  //     ctx.textBaseline = "middle";

  //     ctx.fillText(
  //       `PHOTO ${i + 1}`,
  //       canvas.width / 2,
  //       y + photoHeight / 2
  //     );
  //   }

  //   // =========================
  //   // Footer
  //   // =========================

  //   ctx.fillStyle = "#333333";
  //   ctx.font = "bold 24px sans-serif";
  //   ctx.textAlign = "center";
  //   ctx.textBaseline = "middle";

  //   ctx.fillText(
  //     "Zach ❤️ ___",
  //     canvas.width / 2,
  //     1640
  //   );

  //   ctx.font = "18px sans-serif";

  //   ctx.fillText(
  //     "August 23, 2026",
  //     canvas.width / 2,
  //     1680
  //   );

  //  return canvas.toDataURL("image/png");
  // };

  // const strip = generateStrip();

  React.useEffect(() => {
    if (time === null) return;

    if (time === 0) {
      capture();
      setTime(null);
      return;
    }

    const startTimer = setTimeout(() => {
      setTime((prev) => prev - 1)
    },1000)

    return () => clearTimeout(startTimer);
  },[time]) 

  return (
    <div className="flex flex items-center justify-center gap-24">
      <div className="relative w-3/5">
        <Webcam
          mirrored
          audio={false}
          screenshotFormat="image/jpeg"
          ref={webcamRef}
          className="w-full h-auto"
        />

        {/* capture */}
        {time && (
        <p className="absolute inset-0 flex items-center justify-center text-white text-7xl bold">
          {time == 1 ? "Smile! 📸" : time - 1}
        </p>
        )}
      </div>

      <button onClick={startCountdown} className="bg-blue-500 px-12 py-4 text-white rounded-lg cursor-pointer">Take a picture</button>
      {imgSrc ? 
        <Image alt="Webcam screenshot" src={imgSrc} width={500} height={500}/>
        : "No image yet"} 
{/* 
      <Image src={strip} width={600} height={1800}/> */}
      
    </div>
  );
}
