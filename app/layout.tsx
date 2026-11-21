import type { Metadata } from "next";

import "./globals.css";
import { ToastContainer } from "react-toastify";
import { RTCContextProvider } from "./context/RTCContext";


export const metadata: Metadata = {
  title: "Digital Photobooth | Zach Estrella",
  description: "Digital Photobooth by Zach Estrella",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh flex flex-col">
        <RTCContextProvider>
          <ToastContainer position="top-right" 
                          hideProgressBar={false}
                          closeOnClick={false}
                          pauseOnHover={true}
                          draggable={true}
                          theme="light"/>
          {children}
        </RTCContextProvider>
      </body>
    </html>
  );
}
