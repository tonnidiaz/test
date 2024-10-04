<template>
    <NuxtLink
        :to="`/bots/${bot._id ?? bot.id}`"
        class="border-1 border-card bg-base-200 p-4 br-1 bot-card w-full"
    >
        <div class="flex flex-col justify-between gap-3 h-full">
            <div class="flex gap- justify-between">
                <div class="flex gap-4 overflow-hidden">
                    <div>
                        <UAvatar
                            :online="bot.active"
                            borderColor="neutral"
                            shape="circle"
                            innerclass="ring relative w-35px h-35px flex items-center justify-center"
                        >
                            <span>
                                <i class="fi fi-br-user-robot"></i>
                            </span>
                        </UAvatar>
                    </div>
                    <div class="overflow-hidden w-full">
                        <h4 class="text-gray-200 fw-6 fs-14">{{ bot.name }}</h4>
                        <div v-if="bot.type == 'arbitrage' || bot.is_child">
                            <UBadge
                                v-if="bot.is_child"
                                label="C"
                                color="yellow"
                                class="badge-sm badge-warning"
                            />
                            <UBadge
                                v-if="bot.type == 'arbitrage'"
                                label="P"
                                color="green"
                                class="badge-sm badge-success"
                            />
                        </div>

                        <h6 class="fs-11 fw-6 text-gray-200">
                            On {{ bot.platform }}
                        </h6>
                        <h6 class="fs-11 fw-6 text-gray-400">
                            <span>{{ bot.base }}/{{ bot.ccy }}</span>
                            <span class="">{{
                                bot.type == "arbitrage"
                                    ? `${bot.C}/${bot.B}`
                                    : ""
                            }}</span>
                        </h6>
                        <h6 class="fs-11 fw-6 text-gray-200">
                            {{ bot.orders || 0 }} orders
                        </h6>
                        <div class="mt-1 overflow-hidden">
                            <p
                                class="fs-13"
                                style="
                                    text-overflow: ellipsis;
                                    white-space: nowrap;
                                    overflow: hidden;
                                "
                            >
                                {{ bot.desc }}
                            </p>
                        </div>
                    </div>
                </div>
                <div class="" v-if="!bot.is_child">
                    <CtxMenu v-model="menuOpen">
                        <template v-slot:toggler>
                            <UButton
                                size="sm"
                                :ui="{ rounded: 'rounded-full' }"
                                class="btn-ghost rounded-full btn-sm w-30px h-30px btn-neutral"
                                variant="ghost"
                                color="gray"
                                ><span class="fs-16 relative top-1">
                                    <i
                                        class="fi fi-br-menu-dots-vertical"
                                    ></i> </span
                            ></UButton>
                        </template>
                        <template v-slot:children>
                            <li
                                @click="e => onMenuItemClick(e, (e)=> activateBot((e.target as any).parentElement, props.bot, props.updateBot))"
                            >
                                <span>{{
                                    bot.active ? "Deactivate" : "Activate"
                                }}</span>
                            </li>
                            <li
                                :class="!bot.orders ? 'disabled' : ''"
                                @click="e=> onMenuItemClick(e, (e) => clearBotOrders((e.target as any).parentElement, bot, updateBot))"
                            >
                                <span>Clear orders</span>
                            </li>
                            <li
                                @click="e=> onMenuItemClick(e, (e)=>delBot((e.target as any).parentElement, bot, (res)=> {setBots(res)}))"
                            >
                                <span class="text-red-500">Delete bot</span>
                            </li>
                        </template>
                    </CtxMenu>
                </div>
            </div>

            <tu-modal v-if="bot.children" v-model="childrenModalOpen">
                <template #toggler>
                    <UButton class="w-full btn-neutral btn-sm">
                        Children
                    </UButton>
                </template>
                <template #content>
                    <tu-card class="min-w-200px">
                        <template #header>Children</template>
                        <div class="flex flex-col gap-2">
                        <BotCard
                            v-for="ch of bot.children"
                            :bot="ch"
                            class="p-0 br-10"
                        />
                    </div>
                    </tu-card>
                    
                </template>
            </tu-modal>
        </div>
    </NuxtLink>
</template>
<script setup lang="ts">
import { delBot } from "~/utils/funcs";
import { useUserStore } from "~/src/stores/user";

const { setBots } = useUserStore();
const { bots } = storeToRefs(useUserStore());
const menuOpen = ref(false),
    childrenModalOpen = ref(false);
const props = defineProps({
    bot: { type: Object, required: true },
    updateBot: { type: Function },
});

const onMenuItemClick = async (e, fn: (e) => any) => {
    const close = await fn(e);
    if (close) menuOpen.value = false;
};
</script>
