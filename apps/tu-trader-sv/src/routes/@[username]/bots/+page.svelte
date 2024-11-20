<div>
    <TMeta title={`${data.username}'s bots - ${SITE}`} />
    <div class="sm:p-5 p-1">
        <h1 class="text-xl text-gray-200">My bots</h1>
        <div class="mt-5">
            <UFormGroup>
                 <UCheckbox label="Show all" bind:value={_state.all}/> 
            </UFormGroup>
          {#if bots.length}

            <div
                class="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-3"
            >
            {#each bots.filter(el => _state.all ? true : !el.is_child) as bot}
            <BotCard
                    bot={bot}
                    updateBot={updateBots}
                />
            {/each}
                
            </div>
            {/if}
        </div>
    </div>
    <TuTeleport to="#floating-actions">
        <BotFormModal
            bind:open={modalOpen}
            onDone={(val) => setBots([val, ...bots])}
        >
           {#snippet toggler()}
           <!-- svelte-ignore a11y_click_events_have_key_events -->
           <!-- svelte-ignore a11y_no_static_element_interactions -->
           <div onclick={()=> {modalOpen = true}}
            class="btn btn-primary btn-sm justify-center items-center flex rounded rounded-full h-40px w-45px shadow shadow-lg fs-40"
        >
            <span class="fs-18"
                ><i class="fi fi-br-plus"></i
            ></span></div
    >
           {/snippet}
        </BotFormModal>
    </TuTeleport>
</div>

<script lang="ts">
    import { page } from "$app/stores";
    import BotFormModal from "@/components/BotFormModal.svelte";
    import TMeta from "@/components/TMeta.svelte";
    import TuTeleport from "@/components/TuTeleport.svelte";
    import UCheckbox from "@/components/UCheckbox.svelte";
    import UFormGroup from "@/components/UFormGroup.svelte";
    import { BEND_URL, SITE } from "@/lib/constants";
    import { setBots, userStore } from "@/stores/user.svelte";
    import type { IObj } from "@cmn/utils/interfaces";
    import { onMount } from "svelte";


const {data} = $props()

let _state = $state({all: false})
let { bots } = $derived(userStore);

let modalOpen = $state(false);


const updateBots = (bot: IObj) => {
    const _bots = [...bots];
    const botIndex = _bots.findIndex((el) => {
        return (el._id ?? el.id) == (bot._id ?? bot.id);
    });
    _bots[botIndex] = bot;
    setBots(_bots);
};

onMount(() => {
    // setBots(props.);
});
</script>