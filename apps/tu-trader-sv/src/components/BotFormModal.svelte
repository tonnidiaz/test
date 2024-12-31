<script lang="ts">
    import { listToOpt, toSelectStrategies } from "@/lib/funcs";
    import type { IObj } from "@cmn/utils/interfaces";
    import TuCard from "./TuCard.svelte";
    import TuModal from "./TuModal.svelte";
    import UButton from "./UButton.svelte";
    import UCheckbox from "./UCheckbox.svelte";
    import UDivider from "./UDivider.svelte";
    import UForm from "./UForm.svelte";
    import UFormGroup from "./UFormGroup.svelte";
    import UInput from "./UInput.svelte";
    import UTextarea from "./UTextarea.svelte";
    import { appStore } from "@/stores/app.svelte";
    import type { HTMLAttributes } from "svelte/elements";
    import { onMount, untrack, type Snippet } from "svelte";
    import { userStore } from "@/stores/user.svelte";
    import { api, localApi } from "@/lib/api";
    import { botTypes, arbitTypes, selectIntervals, selectSymbols } from "@/lib/constants";
    import TriArbitForm from "./TriArbitForm.svelte";
    import TuSelect from "./TuSelect.svelte";
    import UAccordion from "./UAccordion.svelte";
    import { handleErrs, isTuError } from "@cmn/utils/functions";

    let { strategies, platforms } = $derived(appStore);

    interface IProps extends HTMLAttributes<HTMLDivElement> {
        mode?: "Create" | "Edit";
        open: boolean;
        bot?: IObj;
        onDone?: (bot: IObj) => any;
        toggler?: Snippet
    }
    let { open = $bindable(), bot, toggler: _toggler, onDone, mode = "Create", ...props }: IProps = $props();
    let { user } = $derived(userStore);

    let formState = $state<IObj>({
            demo: true,
            platform: "bybit",
            type: "normal",
            child_pairs: [],
            arbit_settings: {
                _type: "tri",
                min_perc: 1,
                flipped: false,
                use_ws: false,
            },
        }),
        err = $state(""),
        btnLoading = $state(false);

    const handleSubmit = async () => {
        try {
            err = "";
            let data = { ...formState };
            delete data.id;
            delete data.orders;
            delete data.aside;
            delete data.total_base;
            delete data.total_quote;
            delete data.arbit_orders;
            data.pair = data.pair?.split(",");
            data =
                mode == "Create"
                    ? { ...data, user: user?.username }
                    : { key: "multi", val: { ...data } };
            //        console.log(data);
            btnLoading = true;
            const url =
                mode == "Create" ? "/bots/create" : `/bots/${bot!.id}/edit`;
            const _api = mode == "Create" ? localApi : api
            const res = await _api(true).post(url, data);
            onDone?.(res.data);
            btnLoading = false;
            open = false;
        } catch (e: any) {
            handleErrs(e);
            const _err = isTuError(e) || "Something went wrong";
            err = _err;
            btnLoading = false;
        }
    };
    onMount(()=>{
        let d = sessionStorage.getItem("bot_form_state");
        // console.log({d: JSON.parse(d)});
        if (d){formState = JSON.parse(d)}
    })
    $effect(() => {
        untrack(() => {
            formState = { ...formState, ...bot };
        });
    });

    $effect(()=>{
        const s = formState;
        // console.log({s:{...s}});
        sessionStorage.setItem("bot_form_state", JSON.stringify(s))
    })

    
</script>

<TuModal bind:open={open}>
    {#snippet toggler()}
        {@render _toggler()}
    {/snippet}
    {#snippet content()}
        <TuCard>
            {#snippet header()}
                {mode} bot
            {/snippet}
            <UForm class="flex flex-col gap-2" onsubmit={handleSubmit}>
                <div class="grid sm:grid-cols-2 gap-3 items-end">
                    <UFormGroup label="Bot name">
                        <UInput
                            bind:value={formState.name}
                            required
                            placeholder="Enter bot name..."
                        />
                    </UFormGroup>
                    <UFormGroup>
                        <TuSelect
                            bind:value={formState.type}
                            class="w-full"
                            searchable
                            innerHint="Search..."
                            placeholder="Bot type"
                            disabled={mode == "Edit" &&
                                formState.orders?.length}
                            required
                            options={listToOpt(botTypes)}
                        />
                    </UFormGroup>
                </div>
                {#if formState.type == "arbitrage"}
                    <UAccordion class="my-1">
                        {#snippet label()}
                            Arbitrage settings
                        {/snippet}
                        {#snippet content()}
                            <div
                                class="grid sm:grid-cols-2 gap-3 items-end mt-4 mb-1"
                            >
                                <UFormGroup label="Arbit type">
                                    <TuSelect
                                        bind:value={formState.arbit_settings
                                            ._type}
                                        class="w-full"
                                        searchable
                                        disabled={formState.type == "normal" ||
                                            (mode == "Edit" &&
                                                formState.orders?.length)}
                                        innerHint="Search..."
                                        placeholder="Arbitrage type"
                                        required
                                        options={listToOpt(arbitTypes)}
                                    />
                                </UFormGroup>
                                <UFormGroup label="Min. arbit %">
                                    <UInput
                                        disabled={formState.type == "normal"}
                                        required
                                        bind:value={formState.arbit_settings
                                            .min_perc}
                                        placeholder="e.g .3"
                                        type="number"
                                        step="any"
                                    />
                                </UFormGroup>
                            </div>
                            <div class="my-2 gap-2 justify-center grid grid-cols-2 items-center">
                                <UCheckbox
                                    label="SUPER_MEGA BOT"
                                    title="A BOT THAT USES ALL PAIRS FROM A PLATFORM"
                                    bind:value={formState.arbit_settings.super_mega}
                                ></UCheckbox>
                                <UCheckbox
                                    label="MEGA BOT"
                                    title="A BOT WITH ARBITRAGE CHILDREN"
                                    bind:value={formState.arbit_settings.mega}
                                    disabled={formState.arbit_settings.super_mega}
                                ></UCheckbox>
                                <UCheckbox
                                    label="Use Ws"
                                    title="Use websockets"
                                    bind:value={formState.arbit_settings.use_ws}
                                ></UCheckbox>
                            </div>

                            {#if !formState.arbit_settings.mega || formState.arbit_settings.super_mega}
                                <TriArbitForm bind:value={formState} />
                            {:else}
                                <UAccordion>
                                    {#snippet label()}
                                        Child bots
                                    {/snippet}
                                    {#snippet content()}
                                        {#each formState.child_pairs as pair, i}
                                            <div class="my-3">
                                                <div
                                                    class="flex w-full items-center gap-3 justify-between"
                                                >
                                                    <h5>Bot #{i + 1}</h5>
                                                    <UButton
                                                        onclick={() => {
                                                            formState.child_pairs =
                                                                formState.child_pairs.filter(
                                                                    (el, j) =>
                                                                        j != i
                                                                );
                                                            formState.child_pairsCnt += 1;
                                                        }}
                                                        class="btn-sm w-34px h-30px rounded-lg btn-neutral"
                                                    >
                                                        <i
                                                            class="fi fi-br-trash fs-12"
                                                        ></i>
                                                    </UButton>
                                                </div>

                                                <TriArbitForm
                                                    bind:value={formState
                                                        .child_pairs[i]}
                                                />
                                                <UDivider class="my-4" />
                                            </div>
                                        {/each}

                                        <div>
                                            <div
                                                class="flex"
                                                style="justify-content: flex-end"
                                            >
                                                <UButton
                                                    onclick={() => {
                                                        formState.child_pairs.push(
                                                            {}
                                                        ),
                                                            (formState.child_pairsCnt += 1);
                                                    }}
                                                    class="w-full btn-sm h-30px rounded-lg btn-neutral"
                                                >
                                                    <i
                                                        class="fi fi-br-plus fs-12"
                                                    ></i>
                                                </UButton>
                                            </div>
                                        </div>
                                    {/snippet}
                                </UAccordion>
                            {/if}
                        {/snippet}
                    </UAccordion>
                {/if}

                <div
                    class="grid grid-cols-2 items-center justify-between gap-3 my-1"
                >
                    <UFormGroup label="Start amount">
                        <UInput
                            required
                            bind:value={formState.start_amt}
                            placeholder="Enter start amount..."
                            type="number"
                            step="any"
                        />
                    </UFormGroup>
                    {#if mode == "Edit"}
                        <UFormGroup label="Balance">
                            <UInput
                                required
                                bind:value={formState.balance}
                                placeholder="Enter balance..."
                                type="number"
                                step="any"
                                title="Increase/decrease the funds you're willing to trade with"
                            />
                        </UFormGroup>
                    {/if}

                    <UFormGroup label="Platform">
                        <TuSelect
                            required
                            options={platforms.map((el) => ({
                                label: el.toUpperCase(),
                                value: el.toLocaleLowerCase(),
                            }))}
                            placeholder="Platform"
                            bind:value={formState.platform}
                        />
                    </UFormGroup>
                </div>

                <div class="grid grid-cols-2 gap-3 my-1">
                    <TuSelect
                        required
                        options={selectIntervals}
                        bind:value={formState.interval}
                        placeholder="Interval"
                    />
                    <TuSelect
                        required
                        options={["Market", "Limit"].map((el) => ({
                            label: el,
                            value: el,
                        }))}
                        placeholder="Order type"
                        bind:value={formState.order_type}
                    />
                </div>
                {#if formState.type == "normal"}
                    <div class="grid grid-cols-2 gap-3 my-1">
                        <TuSelect
                            required
                            options={toSelectStrategies(strategies)}
                            bind:value={formState.strategy}
                            searchable
                            placeholder="Strategy"
                            innerHint="Search strategy..."
                        />
                        <TuSelect
                            required
                            options={selectSymbols}
                            bind:value={formState.pair}
                            searchable
                            placeholder="Pair"
                            innerHint="Search pair..."
                        />
                    </div>
                {/if}

                <UFormGroup label="Description">
                    <UTextarea
                        bind:value={formState.desc}
                        placeholder="Bot description..."
                    />
                </UFormGroup>
                {#if mode == "Edit"}
                    <div class="flex items-center flex-row justify- gap-5">
                        <UCheckbox label="Demo" bind:value={formState.demo} />
                    </div>
                {/if}
                {#if err.length}
                    <p class="text-center text-xs text-red-400">
                        {err?.replace("tu:", "")}
                    </p>
                {/if}

                <UFormGroup class="mt-">
                    <UButton
                        loading={btnLoading}
                        type="submit"
                        class="btn-primary w-full">Submit</UButton
                    >
                </UFormGroup>
            </UForm>
        </TuCard>
    {/snippet}
</TuModal>
