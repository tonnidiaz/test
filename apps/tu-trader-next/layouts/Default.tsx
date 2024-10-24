"use client"
import { useDispatch, useSelector } from "react-redux";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { useEffect, useState } from "react";
import { setUser } from "../redux/reducers/user";
import { setParents, setPlatforms, setReady, setStrategies } from "../redux/reducers/app";
import { RootState } from "../redux/store";
import Loader from "../components/Loader";
import {  pagesWithLayout, setSocket, socket } from "@/utils/constants";
import { sleep } from "@cmn/utils/functions";
import { io } from "socket.io-client";
import { localApi } from "@cmn/utils/api";
import { BEND_URL } from "@cmn/utils/consts3";

const DefaultLayout = ({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) => {
    const dispatch = useDispatch();
    const appStore = useSelector((state: RootState) => state.app);
    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => {
        setIsMounted(true)
        initSocket()
        init();
    }, []);

    const getUser = async () => {
        try {
            console.log("GETTING USER");
            const res = await localApi(true).post("/auth/login", {});
            dispatch(setUser(res.data.user));
        } catch (e) {
            console.log(e);
        }
    };

    const getStrategies = async () => {
        try {
            console.log("GETTING STRATEGIES...");
            const res = await localApi().get("/strategies");
            dispatch(setStrategies(res.data));
            console.log("GOT THE STRATEGIES");
        } catch (error) {
            console.log(error);
        }
    };
    const getPlatforms = async () => {
        try {
            console.log("GETTING PLATFORMS...");
            const res = await localApi().get("/platforms");
            dispatch(setPlatforms(res.data));
            console.log("GOT THE PLATFORMS");
        } catch (error) {
            console.log(error);
        }
    };
    const getParents = async () => {
        try {
            console.log("GETTING PARENTS...");
            const res = await localApi().get("/parents");
            dispatch(setParents(res.data));
            console.log("GOT THE PARENTS");
        } catch (error) {
            console.log(error);
        }
    };

    const initSocket = ()=>{
        try {
            console.log("DEFAULT MOUNTED")
            setSocket(
                io(
                    BEND_URL /* */ , {auth: {username: 'tonnidiaz',}, timeout: 100 * 100000000000}
                )
            );
            socket?.on("connect", () => {
                console.log(`IO CONNECTED`);
            });
            socket?.on("error", () => {
                console.log(`IO ERR`);
            });
           
        } catch (err) {
            console.log("IO INIT ERR");
            console.log(err);
        }
    }
    const init = async () => {
        console.log(pagesWithLayout.indexOf(location.pathname ) == -1 );
        await getUser();
        getStrategies();
        getParents()
        getPlatforms()
        dispatch(setReady(true));
    };

    if (!isMounted) return
    return !appStore.ready ? (
      <Loader/>
    ) : (
        <>
            { pagesWithLayout.indexOf(location.pathname ) == -1 && <Navbar></Navbar>}
            <div className={pagesWithLayout.indexOf(location.pathname ) == -1 ? "tu-app" : ""}>
            { pagesWithLayout.indexOf(location.pathname ) == -1 && <Sidebar></Sidebar>}
                <main>{children}</main>
            </div>
            <div id="ctx-overlay"></div>
        </>
    );
};

export default DefaultLayout;
