<script lang="ts">
    import { setBots, userStore } from "@/stores/user.svelte";
import TuLink from "./TuLink.svelte";
    import TuModal from "./TuModal.svelte";
    import type { HTMLAnchorAttributes } from "svelte/elements";
    import type { IObj } from "@cmn/utils/interfaces";
    import { activateBot, clearBotOrders, delBot } from "@/lib/funcs";
    import TuCard from "./TuCard.svelte";
    import UAvatar from "./UAvatar.svelte";
    import UButton from "./UButton.svelte";
    import UBadge from "./UBadge.svelte";
    import BotCard from "./BotCard.svelte";
    import CtxMenu2 from "./CtxMenu2.svelte";

let { bots } = $derived(userStore);
let menuOpen = $state(false),
    childrenModalOpen = $state(false);


interface IProps extends HTMLAnchorAttributes{bot: IObj; updateBot?: (val: IObj)=>any}
const {bot, updateBot, class: _class, ...props} : IProps = $props()
const onMenuItemClick = async (e, fn: (e) => any) => {
    const close = await fn(e);
    if (close) menuOpen = false;
};

</script>
<TuLink
        to={`/bots/${bot._id ?? bot.id}`}
        class={"border-1 border-card bg-base-200 p-4 br-1 bot-card w-full " + _class || ''} {...props}
    >
        <div class="flex flex-col justify-between gap-3 h-full">
            <div class="flex gap- justify-between">
                <div class="flex gap-4 overflow-hidden">
                    <div>
                        <UAvatar
                            online={bot.active}
                            innerclass="ring relative w-35px h-35px flex items-center justify-center"
                        >
                            <span>
                                <i class="fi fi-br-user-robot"></i>
                            </span>
                        </UAvatar>
                    </div>
                    <div class="overflow-hidden w-full">
                        <h4 class="text-gray-200 fw-6 fs-14">{ bot.name }</h4>
                        {#if bot.type == 'arbitrage' || bot.is_child}
                            <div>
                                {#if bot.is_child}
                                   <UBadge
                                label="C"
                                class="badge-sm badge-warning"
                            /> 
                                {/if}
                            {#if bot.type == 'arbitrage'}
                                <UBadge
                                label="P"
                                class="badge-sm badge-success"
                            />
                            {/if}
                            
                        </div>
                        {/if}
                        

                        <h6 class="fs-11 fw-6 text-gray-200">
                            On { bot.platform }
                        </h6>
                        <h6 class="fs-11 fw-6 text-gray-400">
                            <span>{ bot.base }/{ bot.ccy }</span>
                            <span class="">{
                                bot.type == "arbitrage"
                                    ? `${bot.C}/${bot.B}`
                                    : ""
                            }</span>
                        </h6>
                        <h6 class="fs-11 fw-6 text-gray-200">
                            { bot.orders || 0 } orders
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
                                { bot.desc }
                            </p>
                        </div>
                    </div>
                </div>
                {#if !bot.is_child}
                 <div>
                    <CtxMenu2 bind:open={menuOpen}>
                        {#snippet toggler()}
                             <UButton
                                class="btn-ghost rounded-full btn-sm w-30px h-30px btn-neutral"
                                ><span class="fs-16 relative top-1">
                                    <i
                                        class="fi fi-br-menu-dots-vertical"
                                    ></i> </span
                            ></UButton>
                        {/snippet}
                        
                        <ul>
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                            <li
                                onclick={e => onMenuItemClick(e, (e)=> activateBot((e.target as any).parentElement, bot, updateBot))}
                            >
                                <span>{
                                    bot.active ? "Deactivate" : "Activate"
                                }</span>
                            </li>
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                            <li
                                class={!bot.orders ? 'disabled' : ''}
                                onclick={e=> onMenuItemClick(e, (e) => clearBotOrders((e.target as any).parentElement, bot, updateBot))}
                            >
                                <span>Clear orders</span>
                            </li>
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                            <li
                                onclick={e=> onMenuItemClick(e, (e)=>delBot((e.target as any).parentElement, bot, (res)=> {setBots(res)}))}
                            >
                                <span class="text-red-500">Delete bot</span>
                            </li>
                        </ul>
                    </CtxMenu2>
                </div>   
                {/if}
                
            </div>
            {#if bot.children}
                <TuModal  bind:open={childrenModalOpen}>
                    {#snippet toggler()}
                        <UButton class="w-full btn-neutral btn-sm">
                        Children
                    </UButton>
                    {/snippet}
                    {#snippet content()}
                        <TuCard class="min-w-200px">
                            {#snippet header()}
                                Children
                            {/snippet}
                        <div class="flex flex-col gap-2">
                            {#each bot.children as ch}
                                <BotCard
                            bot={ch}
                            class="p-0 br-10"
                        />
                            {/each}
                        
                    </div>
                    </TuCard>
                    {/snippet}
               
            </TuModal>
            {/if}
            
        </div>
    </TuLink>
