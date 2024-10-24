"use client";
import { Theme } from "react-daisyui";
import "@/src/styles/globals.css";
 import "@/src/styles/styles2.scss";
  import "@/src/styles/page-progress.css";
 import "@/src/styles/select.scss";
 import "@/src/styles/styles.scss";
 import "@/src/styles/daisy.scss";
 import "@/src/styles/scrollbar.scss";
 import "@/src/styles/components.scss";
import { Provider } from "react-redux";
import { store } from "../redux/store";
import DefaultLayout from "../layouts/Default";
import { useEffect } from "react";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
 

    return (
        <html lang="en">
            <body className="dark">
                <Provider store={store}>
                    <Theme dataTheme="tb" style={{height: "100vh"}}>
                            <DefaultLayout>
                                
                                    {children}
                                    <div id="ctx-overlay"></div>
                                    <div id="floating-actions"/>
                            </DefaultLayout>
                    
                    </Theme>
                </Provider>
            </body>
        </html>
    );
}
