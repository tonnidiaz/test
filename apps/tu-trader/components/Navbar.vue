<template>
       <div class="navbar !z-[51]">
            <div class="navbar-start">
                <div class="dropdown">
                    <label tabindex="0" class="btn btn-ghost btn-circle">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 6h16M4 12h16M4 18h7"
                            />
                        </svg>
                    </label>
                    <ul
                        tabindex="0" 
                        class="menu menu-menu menu-sm text-left justify-start open border-1 border-card dropdown-content mt-3 z-[100] p-2 shadow bg-base-100 rounded-md"
                    >
                        <li><NuxtLink to="/">Home</NuxtLink></li>
                        <li><NuxtLink to="/test/arbit/cross/coins">Cross-arbit cointest</NuxtLink></li>
                        <li><NuxtLink to="/rf/ws/book-ticker">RF Book Ticker</NuxtLink></li>
                        <li><NuxtLink to="/rf/nets">Networks</NuxtLink></li>
                        <li><NuxtLink to="/app/config">App config</NuxtLink></li>
                        <li><NuxtLink to="/data/books">Orderbooks</NuxtLink></li>
                        <li><NuxtLink to="/test/candles">Candletest</NuxtLink></li>
                      
                    </ul>
                </div>
            </div>
            <div class="navbar-center">
                <a href="/" class="btn btn-ghost normal-case text-xl">{{SITE}}</a>
            </div>
            <div class="navbar-end">
                <ul class="menu menu-horizontal p-0 px-1 md:flex hidden">
                    <li>
                        <NuxtLink to="/about">About</NuxtLink>
                    </li>
                    <li>
                        <NuxtLink to="/contact">Contact us</NuxtLink>
                    </li>
                </ul>
           
                <button class="btn btn-ghost btn-circle">
                    <div class="indicator">
                        IO
                        <span
                            :class="`badge badge-xs ${ioConnected ?'badge-primary': 'badge-warning'} indicator-item`"
                        ></span>
                    </div>
                </button>
            <div v-if="user" class="relative">
                <CtxMenu
                  v-model="menuOpen"
                  class="relative mr-4"
                >
                    <template v-slot:toggler
                        ><UAvatar class="pointer"
                            ><span class="text-md fw-7">{{
                                user.username.slice(0, 1).toUpperCase()
                            }}</span></UAvatar
                        ></template
                    >
                    <template v-slot:children>
                        <menu-item
                            to="/profile"
                            icon="i-heroicons-user-circle-16-solid"
                            >Profile</menu-item
                        >
                        <menu-item
                            :to="`/@${user.username}/bots`"
                            icon="fi fi-br-user-robot-xmarks"
                            >Bots</menu-item
                        >
                        <menu-item
                            :to="`/auth/logout`"
                            icon="fi fi-br-sign-out-alt"
                            >Logout</menu-item
                        >
                    </template>
                </CtxMenu>
            </div>
            <div v-else>
                <UButton variant="outline">
                    <NuxtLink
                        :to="`/auth/login?red=${$route.fullPath}`"
                        class="btn btn-sm btn-outline btn-primary"
                    >
                        Login
                    </NuxtLink></UButton
                >
            </div>
        </div>
        </div>
</template>
<script setup lang="ts">

import { useUserStore } from "@/src/stores/user";
import CtxMenu from "./CtxMenu.vue";
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { SITE, socket } from "~/utils/constants";
const ioConnected = ref(true)
const menuOpen = ref(false);
const { user } = storeToRefs(useUserStore());

const menuItems = [
    [
        {
            label: "Profile",
            icon: "i-heroicons-user-circle-20-solid",
        },
    ],
];

onMounted(()=>{
    socket?.on('connect', ()=> ioConnected.value = true)
    socket?.on('disconnect', ()=> ioConnected.value = false)
})
</script>

<style>
ul.menu-menu li{
    padding: 0!important;
    margin: 0!important;
    align-self: flex-start;
    width: 100%;
    *{
        align-self: flex-start;
        width: 100%
    }
}
</style>