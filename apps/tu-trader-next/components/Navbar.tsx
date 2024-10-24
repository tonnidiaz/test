import { RootState } from "@/redux/store";
import { SITE, socket } from "@/utils/constants";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import CtxMenu from "./CtxMenu";
import UAvatar from "./UAvatar";
import MenuItem from "./MenuItem";
import UButton from "./UButton";

const Navbar = () => {
    const userStore = useSelector((state: RootState) => state.user);
    const { user } = userStore;
    const [ioConnected, setIoConnected] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        socket?.on("connect", () => setIoConnected(true));
        socket?.on("disconnect", () => setIoConnected(false));

        return () => {
            socket?.off("connect");
            socket?.off("disconnect");
        };
    }, []);

    return (
        <div className="navbar !z-[51]">
            <div className="navbar-start">
                <div className="dropdown">
                    <label tabIndex={0} className="btn btn-ghost btn-circle">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 6h16M4 12h16M4 18h7"
                            />
                        </svg>
                    </label>
                    <ul
                        tabIndex={0}
                        className="menu menu-menu menu-sm text-left justify-start open border-1 border-card dropdown-content mt-3 z-[100] p-2 shadow bg-base-100 rounded-md"
                    >
                        <li>
                            <Link href="/">Home</Link>
                        </li>
                        <li>
                            <Link href="/test/arbit/cross/coins">
                                Cross-arbit cointest
                            </Link>
                        </li>
                        <li>
                            <Link href="/rf/ws/book-ticker">
                                RF Book Ticker
                            </Link>
                        </li>
                        <li>
                            <Link href="/rf/nets">Networks</Link>
                        </li>
                        <li>
                            <Link href="/app/config">App config</Link>
                        </li>
                        <li>
                            <Link href="/data/books">Orderbooks</Link>
                        </li>
                        <li>
                            <Link href="/test/candles">Candletest</Link>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="navbar-center">
                <a href="/" className="btn btn-ghost normal-case text-xl">
                    {SITE}
                </a>
            </div>
            <div className="navbar-end">
                <ul className="menu menu-horizontal p-0 px-1 md:flex hidden">
                    <li>
                        <Link href="/about">About</Link>
                    </li>
                    <li>
                        <Link href="/contact">Contact us</Link>
                    </li>
                </ul>
                <button className="btn btn-ghost btn-circle">
                    <div className="indicator">
                        IO
                        <span
                            className={`badge badge-xs ${ioConnected ? "badge-primary" : "badge-warning"} indicator-item`}
                        ></span>
                    </div>
                </button>
                {user ? (
                    <div className="relative">
                        <CtxMenu
                            open={menuOpen}
                            setOpen={setMenuOpen}
                            onToggle={() => setMenuOpen(!menuOpen)}
                            className="relative mr-4"
                            toggler={
                                <UAvatar className="pointer">
                                    <span className="text-md fw-7">
                                        {user.username
                                            .slice(0, 1)
                                            .toUpperCase()}
                                    </span>
                                </UAvatar>
                            }
                        >
                            <div className="flex flex-col">
                                <MenuItem
                                    to="/profile"
                                    className="menu-item"
                                    icon="i-heroicons-user-circle-16-solid"
                                >
                                    Profile
                                </MenuItem>
                                <MenuItem
                                    to={`/@${user.username}/bots`}
                                    className="menu-item"
                                    icon="fi fi-br-user-robot-xmarks"
                                >
                                    Bots
                                </MenuItem>
                                <MenuItem
                                    to="/auth/logout"
                                    className="menu-item"
                                    icon="fi fi-br-sign-out-alt"
                                >
                                    Logout
                                </MenuItem>
                            </div>
                        </CtxMenu>
                    </div>
                ) : (
                    <UButton>
                        <Link className="btn btn-sm btn-outline btn-primary"
                            href={`/auth/login?red=${window.location.pathname}`}
                        >
                            Login
                        </Link>
                    </UButton>
                )}
            </div>
        </div>
    );
};

export default Navbar;
