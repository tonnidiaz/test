<script lang="ts">
    import "@flaticon/flaticon-uicons/css/all/all.css";
    import "@/styles/globals.css";
    import "@/styles/styles2.scss";
    import "@/styles/page-progress.css";
    import "@/styles/select.scss";
    import "@/styles/styles1.scss";
    import "@/styles/daisy.scss";
    import "@/styles/scrollbar.scss";
    import "@/styles/components.scss";
    import { onMount } from "svelte";
    import { setSocket, BEND_URL, socket } from "@/lib/constants";
    import { io } from "socket.io-client";
    import {
        appStore,
        setParents,
        setPlatforms,
        setReady,
        setStrategies,
    } from "@/stores/app.svelte";
    import { localApi } from "@/lib/api";
    import { setUser } from "@/stores/user.svelte";
    import Loader from "@/components/Loader.svelte";
    import Navbar from "@/components/Navbar.svelte";
    import Sidebar from "@/components/Sidebar.svelte";
    import { handleErrs } from "@cmn/utils/functions";
    let { children } = $props();
    let { ready } = $derived(appStore);

    const getUser = async () => {
        try {
            console.log("GETTING USER");
            const res = await localApi(true).post("/auth/login?q=token", {});
            setUser(res.data.user);
        } catch (e) {
            handleErrs(e);
        }
    };
    const init = async () => {
        //console.log(pagesWithLayout.indexOf(location.pathname ) == -1 );
        await getUser();
        //console.log('GETTING PLATFORMS...');
        socket?.emit("platforms");
        socket?.emit("parents");
        socket?.emit("strategies");
        //await getPlats();
        setReady(true);
    };

    onMount(() => {
        try {
  
            console.log("DEFAULT MOUNTED");
            setSocket(
                io(BEND_URL /* */, {
                    auth: { username: "tonnidiaz" },
                    timeout: 100 * 100000000000,autoConnect: false
                })
            );
            socket?.on("connect", () => {
                console.log(`IO CONNECTED`);
            });
            socket?.on("error", () => {
                console.log(`IO ERR`);
            });
            socket.on('connect_error', err => handleErrors(err))
        socket.on('connect_failed', err => handleErrors(err))
        } catch (err) {
            console.log("IO INIT ERR");
            console.log(err);
        }
        socket?.on("strategies", ({ data, err }) => {
            if (err) {
                console.log(err);
                return;
            }
            setStrategies(data);
            console.log("GOT THE STRATEGIES");
        });
        socket?.on("platforms", ({ data, err }) => {
            if (err) {
                console.log(err);
                return;
            }
            setPlatforms(data);
            console.log("GOT THE PLATFORMS");
        });
        socket?.on("parents", ({ data, err }) => {
            if (err) {
                console.log(err);
                return;
            }
            setParents(data);
            console.log("GOT THE PARENTS");
        });


        socket.connect()
        init();
    });


    function handleErrors(err: Error): void {
        // throw new Error("Function not implemented.");
        console.log("Handle IO err");
        return
        if (err.message.includes('ERR_CONNECTION_REFUSED')) {
        console.log('Suppressed connection error:', "err.message");
    } else {
        console.error("err");
    }
    }
</script>

{#if !ready}
    <Loader />
{:else}
    <div>
        <Navbar />
        <div class="tu-app">
            <Sidebar/>
            <main style="padding: 0 10px">
                {@render children()}
            </main>
        </div>
    </div>
{/if}

<div id="tu-toasts" class="toast toast-top toast-end">

</div>

  <style>
    .toast{z-index: 100;}
  </style>