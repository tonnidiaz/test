<template>
    <Loader v-if="!ready" />
    <div v-else>
        <Navbar />
        <div class="tu-app">
            <Sidebar />
            <main style="padding: 0 10px"><slot /></main>
        </div>
    </div>
</template>
<script setup lang="ts">
import Navbar from "~/components/Navbar.vue";
import Sidebar from "~/components/Sidebar.vue";
import { useAppStore } from "~/src/stores/app";
import { useUserStore } from "~/src/stores/user";
import { setSocket } from "~/utils/constants";
import { Socket, io } from "socket.io-client";

const appStore = useAppStore();
const { setReady, setStrategies, setPlatforms, setParents } = appStore;
const { setUser } = useUserStore();
const { ready } = storeToRefs(useAppStore());

onMounted(() => {
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
    init();
    
});

const getUser = async () => {
    try {
        console.log("GETTING USER");
        const res = await localApi(true).post("/auth/login", {});
        setUser(res.data.user);
    } catch (e) {
        console.log(e);
    }
};

const getStrategies = async () => {
    try {
        console.log("GETTING STRATEGIES...");
        socket?.emit('strategies')
        //const res = await api().get("/strategies");
        //setStrategies(res.data);
    } catch (error) {
        console.log(error);
    }
};
const getPlats = async () => {
    try {
        console.log("GETTING Platforms...");
        //socket?.emit('strategies')
        const res = await api().get("/platforms");
        setPlatforms(res.data);
    } catch (error) {
        console.log(error);
    }
};

const init = async () => {
    //console.log(pagesWithLayout.indexOf(location.pathname ) == -1 );
    await getUser();
    //console.log('GETTING PLATFORMS...');
    socket?.emit('platforms')
    socket?.emit('parents')
    await getStrategies();
    //await getPlats();
    setReady(true);
};
</script>
