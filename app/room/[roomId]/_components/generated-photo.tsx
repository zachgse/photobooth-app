import { motion, type Variants } from "motion/react";
import Image from "next/image";
import printer from "@/public/assets/printer.png";
import { GoDownload } from "react-icons/go";

interface GeneratedPhotoProps {
    photo: string
}

const slideDown: Variants = {
    hidden: {
        opacity: 0,
        y: -60,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 2,
            ease: "easeOut",
        },
    },
};

export default function GeneratedPhoto({photo}:GeneratedPhotoProps) {
    return (
        <div className="w-full min-h-dvh flex flex-col items-center p-4">
            <Image
                src={printer}
                alt="Printer preview"
                className="md:w-60 w-full h-auto grow-0"
            />
            <motion.div
                className="flex-1 min-h-0 w-full flex justify-center"
                variants={slideDown}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
            >
                <Image
                    src={photo}
                    alt="Photobooth strip"
                    width={600}
                    height={1800}
                    className="w-auto h-full max-w-full object-contain"
                />
            </motion.div>

            <a href={photo} target="_blank" download
                className="bg-black px-12 py-4 text-white rounded-lg 
                    flex items-center justify-center gap-2 cursor-pointer mt-4">
                <GoDownload />
                Download
            </a>
        </div>
    )
}