<script lang="ts">
    import TMeta from "@/components/TMeta.svelte";

    import TuCard from "@/components/TuCard.svelte";
    import TuSelect from "@/components/TuSelect.svelte";
    import UButton from "@/components/UButton.svelte";
    import UCheckbox from "@/components/UCheckbox.svelte";
    import UForm from "@/components/UForm.svelte";
    import UFormGroup from "@/components/UFormGroup.svelte";
    import UInput from "@/components/UInput.svelte";
    import { localApi } from "@/lib/api";
    import { SITE } from "@/lib/constants";
    import { sleep } from "@cmn/utils/functions";
    import type { IObj } from "@cmn/utils/interfaces";
    import { untrack } from "svelte";

    let mstate = $state<IObj>({ type: "tri" }),
        _state = $state<IObj>({});

    let err = $state<string>(),
        killed = $state(true),
        connected = $state(true);
    let pairs = $state<string[][]>([]);
    let nets = $state<IObj[]>([]);
    const CONTR_ADDR_LEN = -7;
    const plats = ["binance", "bitget", "bybit", "kucoin", "okx", "mexc"];
    const types = ["tri", "cross"];
    let formState = $state<IObj>({
        platA: "mexc",
        platB: undefined,
        offline: true,
        pair: ["SOL", "USDT"],
    });

    const handleSubmit = async (e) => {
        try {
            const { platA, platB, offline } = formState;
            console.log({ offline });
            if (platA){
                mstate = {
                    ...mstate,
                    platB: undefined,
                    coinB: undefined,
                    netsB: undefined,
                    netB: undefined,
                };
            }
            if (platB){
                mstate = {
                    ...mstate,
                    platA: undefined,
                    coinA: undefined,
                    netsA: undefined,
                    netA: undefined,
                };
            }
            if (platA) {
                
                const res = await localApi().get("/rf/nets", {
                    params: {
                        plat: platA,
                        offline,
                    },
                });
                mstate.platA = platA;
                mstate.netsA = res.data;
            }
            if (platB) {
                
                const res = await localApi().get("/rf/nets", {
                    params: {
                        plat: platB,
                        offline,
                    },
                });
                mstate.platB = platB;
                mstate.netsB = res.data;
            }
        } catch (err) {
            console.log(err);
        }
    };

    const netHtml = (el: IObj) => {
        return `<div><div>${el.chain}</div><div class="font-monospace">
        <p>fee: ${el.wdFee}</p>
        <p>Min. dep: ${el.minDp}</p>
        <p>Min. wid: ${el.minWd}</p>
        </div><div class="flex items-center gap-2 justify-between w-full"><span class="font-monospace fs-12 fw-6 text-${el.canDep ? "white" : "gray-500"}">Dep</span><span class="font-monospace fs-12 fw-6 text-${el.canWd ? "white" : "gray-500"}">Wid</span></div></div>`;
    };

    const getCoinNets = async (t: "A" | "B") => {
        try {
            if (t == "A") {
                const nets = mstate.netsA?.find(
                    (el) => el.coin == mstate._coinA
                );
                mstate.coinA = nets;
                mstate.chainA = undefined;
                if (nets) {
                    mstate.chainA = nets.nets[0]?.chain;
                }
            } else {
                const nets = mstate.netsB?.find(
                    (el) => el.coin == mstate._coinB
                );
                mstate = {...mstate, coinB: nets};
                mstate.chainB = undefined;
                
                if (nets) {
                    mstate.chainB = nets.nets[0]?.chain;
                }
            }
        } catch (e) {
            console.log(e);
        }
    };
    $effect(() => {
        const cA = mstate.chainA,
            cB = mstate.chainB;
        untrack(() => {
            mstate.netA = mstate.coinA?.nets.find((el) => el.chain == cA);
            mstate.netB = mstate.coinB?.nets.find((el) => el.chain == cB);
        });
    });
</script>

<div>
    <TMeta title={`Networks - ${SITE}`} />
    <div class="sm:p-4 p-2">
        <TuCard
            class="md:p-4 p-2 my-2 h-80vh border-md border-card border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh"
        >
            <div class="flex gap-3 justify-center mb-3">
                <h1 class="fs-14">Networks</h1>
            </div>
            <UForm
                onsubmit={handleSubmit}
                class="border-card border-1 rounded-md p-1 md:p-4 flex flex-col items-center"
            >
                <div class="flex items-start justify-center gap-3 mb-3">
                    <UFormGroup label="Platform A">
                        <TuSelect
                            placeholder="PlatA"
                            options={plats.map((el) => ({
                                label: el.toUpperCase(),
                                value: el,
                            }))}
                            bind:value={formState.platA}
                        />
                    </UFormGroup>
                    <UFormGroup label="Platform B">
                        <TuSelect
                            placeholder="PlatB"
                            options={plats.map((el) => ({
                                label: el.toUpperCase(),
                                value: el,
                            }))}
                            bind:value={formState.platB}
                        />
                    </UFormGroup>
                    <UCheckbox bind:value={formState.offline} label="Offline" />
                </div>
                <div class="my-3">
                    <UButton class="btn-primary w-full" type="submit"
                        >Submit</UButton
                    >
                </div>
            </UForm><TuCard
                class="m-auto md:p-4 p-2 my-2 border-md border-card max-w-550 min-w-500 border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh"
            >
                <div class="flex gap-3 justify-center mb-3">
                    <h1 class="fs-14">Results</h1>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="flex flex-col gap-3">
                        <UFormGroup
                            label={(mstate.platA?.toUpperCase() ??
                                "Platform A") +
                                ` (${mstate.netsA?.length ?? 0})`}
                        >
                            <UForm onsubmit={(_) => getCoinNets("A")}>
                                <UFormGroup>
                                    <UInput
                                        bind:value={mstate._coinA}
                                        placeholder="e.g SOL"
                                        name="coin"
                                    >
                                        {#snippet leading()}
                                            Coin
                                        {/snippet}
                                        {#snippet trailing()}
                                            <UButton
                                                type="submit"
                                                class="btn-ghost"
                                                ><i class="fi fi-br-search"
                                                ></i></UButton
                                            >
                                        {/snippet}
                                    </UInput>
                                </UFormGroup>
                            </UForm>
                        </UFormGroup>
                        <div class="">
                            <b>Coin:</b>
                            <span
                                >{#if mstate.coinA}
                                    [{mstate.coinA.coin}]
                                    {mstate.coinA.name}
                                {:else}
                                    -- -- --{/if}</span
                            >
                        </div>
                        <UFormGroup label="Network">
                            <TuSelect
                                placeholder="Network"
                                options={mstate.coinA?.nets
                                    .toSorted((a, b) => a.wdFee - b.wdFee)
                                    .map((el) => ({
                                        html: netHtml(el),
                                        class: "even:text-primary",
                                        value: el.chain,
                                    })) ?? []}
                                bind:value={mstate.chainA}
                            />
                        </UFormGroup>
                        {#if mstate.netA}
                            <div
                                class="flex justify-between px-3 gap-3 items-center fw-6 font-monospace"
                            >
                                <span>Con. addr:</span>
                                <span class="text-secondary"
                                    >...{mstate.netA.contractAddr?.slice(
                                        CONTR_ADDR_LEN
                                    )}</span
                                >
                            </div>
                        {/if}
                    </div>
                    <div class="flex flex-col gap-3">
                        <UFormGroup
                            label={(mstate.platB?.toUpperCase() ??
                                "Platform B") +
                                ` (${mstate.netsB?.length ?? 0})`}
                        >
                            <UForm onsubmit={(_) => getCoinNets("B")}>
                                <UFormGroup>
                                    <UInput
                                        bind:value={mstate._coinB}
                                        placeholder="e.g SOL"
                                        name="coin"
                                    >
                                        {#snippet leading()}
                                            Coin
                                        {/snippet}
                                        {#snippet trailing()}
                                            <UButton
                                                type="submit"
                                                class="btn-ghost"
                                                ><i class="fi fi-br-search"
                                                ></i></UButton
                                            >
                                        {/snippet}
                                    </UInput>
                                </UFormGroup>
                            </UForm>
                        </UFormGroup>
                        <div class="">
                            <b>Coin:</b>
                            {#if mstate.coinB}
                                <span>
                                    [{mstate.coinB.coin}]
                                    {mstate.coinB.name}
                                </span>
                            {:else}
                                <span> -- -- --</span>
                            {/if}
                        </div>
                        <UFormGroup label="Network">
                            <TuSelect
                                placeholder="Network"
                                options={mstate.coinB?.nets
                                    .toSorted((a, b) => a.wdFee - b.wdFee)
                                    .map((el) => ({
                                        html: netHtml(el),
                                        value: el.chain,
                                    })) ?? []}
                                bind:value={mstate.chainB}
                            />
                        </UFormGroup>
                        {#if mstate.netB}
                            <div
                                class="flex justify-between px-3 gap-3 items-center fw-6 font-monospace"
                            >
                                <span>Con. addr:</span>
                                <span class="text-secondary"
                                    >...{mstate.netB.contractAddr?.slice(
                                        CONTR_ADDR_LEN
                                    )}</span
                                >
                            </div>
                        {/if}
                    </div>
                </div>
            </TuCard>
        </TuCard>
        <!-- <p>NETSA: {{mstate.netsA?.find(el=> el.coin == mstate.coinA)?.nets}}</p> -->
    </div>
</div>
