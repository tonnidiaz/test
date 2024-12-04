<script lang="ts">
    import { page } from "$app/stores";
    import TMeta from "@/components/TMeta.svelte";

    import TuCard from "@/components/TuCard.svelte";
    import TuModal from "@/components/TuModal.svelte";
    import TuSelect from "@/components/TuSelect.svelte";
    import TuTeleport from "@/components/TuTeleport.svelte";
    import UButton from "@/components/UButton.svelte";
    import UCheckbox from "@/components/UCheckbox.svelte";
    import UForm from "@/components/UForm.svelte";
    import UFormGroup from "@/components/UFormGroup.svelte";
    import UInput from "@/components/UInput.svelte";
    import { localApi } from "@/lib/api";
    import { SITE } from "@/lib/constants";
    import { userStore } from "@/stores/user.svelte";
    import { handleErrs } from "@cmn/utils/functions";
    import type { IObj } from "@cmn/utils/interfaces";
    import { redirect } from "@sveltejs/kit";
    import { onMount, untrack } from "svelte";

    let mstate = $state<IObj>({ type: "tri" }),
        _state = $state<IObj>({});

    let err = $state<string>(),
        killed = $state(true),
        addresses = $state<IObj[]>([]);
    let newDepAddrModalOpen = $state(false);
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

    let { user } = $derived(userStore);
    let addrForm = $state<IObj>({});
    const handleSubmit = async (e) => {
        try {
            const { platA, platB, offline } = formState;
            console.log({ offline });

            if (platA) {
                mstate = {
                    ...mstate,
                    platA: undefined,
                    coinA: undefined,
                    netsA: undefined,
                    netA: undefined,
                };
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
                mstate = {
                    ...mstate,
                    platB: undefined,
                    coinB: undefined,
                    netsB: undefined,
                    netB: undefined,
                };
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
                mstate = { ...mstate, coinB: nets };
                mstate.chainB = undefined;

                if (nets) {
                    mstate.chainB = nets.nets[0]?.chain;
                }
            }
        } catch (e) {
            console.log(e);
        }
    };

    const getAddresses = async (username: string) => {
        try {
            const r = await localApi(true).get(`/user/${username}/addresses`);
            addresses = r.data;
        } catch (err) {
            handleErrs(err);
        }
    };

    onMount(() => {
        if (!user) {
            location.href = `/auth/login?red=${location.pathname}`;
            return;
        }
        const { username } = user;
        getAddresses(username);
    });
    $effect(() => {
        const cA = mstate.chainA,
            cB = mstate.chainB;
        untrack(() => {
            mstate.netA = mstate.coinA?.nets.find((el) => el.chain == cA);
            mstate.netB = mstate.coinB?.nets.find((el) => el.chain == cB);
        });
    });

    async function submitDepAddr(e: any) {
        try {
            const r = await localApi(true).post("/user/address/add", {
                ...addrForm,
                coin: mstate._coinA,
                chain: mstate.chainA,
                plat: mstate.platA,
            });
            addresses = [r.data, ...addresses];
            newDepAddrModalOpen = false;
        } catch (err) {
            console.log("Failed to add deposit address");
            handleErrs(err);
        }
    }
</script>

<div>
    <TMeta title={`My account - ${SITE}`} />
    <div class="sm:p-4 p-2">
        <TuCard
            class="md:p-4 p-2 my-2 h-80vh border-md border-card border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh"
        >
            <div class="flex gap-3 justify-center mb-3">
                <div>
                    <h1 class="fs-14">Deposit addresses</h1>
                    <div class="my-3">
                        {#if addresses.length}
                            <div class="flex gap-2 items-center">
                                {#each addresses as addr}
                                    <div
                                        class="dep-addr-card rounded rounded-md border border-card border-1 p-3"
                                    >
                                        <h3><b>Coin:&nbsp;</b>{addr.coin}</h3>
                                        <h3><b>Plat:&nbsp;</b>{addr.plat}</h3>
                                        <p><b>Chain:&nbsp;</b>{addr.chain}</p>
                                        <p title={addr.addr}>
                                            <b>Address:&nbsp;</b>{addr.addr}
                                        </p>
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <h4 class="fs-30 fw-7 text-center">No addresses</h4>
                        {/if}
                    </div>
                </div>
            </div>
            <TuTeleport to="#floating-actions">
                <TuModal bind:open={newDepAddrModalOpen}>
                    {#snippet toggler()}
                        <UButton class="btn-primary">Add dep address</UButton>
                    {/snippet}
                    {#snippet content()}
                        <TuCard>
                            {#snippet header()}
                                New deposit address
                            {/snippet}
                            <div>
                                <UForm
                                    onsubmit={handleSubmit}
                                    class="border-card border-1 rounded-md p-1 md:p-4 flex flex-col items-center"
                                >
                                    <div
                                        class="flex items-start justify-center gap-3 mb-3"
                                    >
                                        <UFormGroup label="Platform">
                                            <TuSelect
                                                placeholder="Platform"
                                                options={plats.map((el) => ({
                                                    label: el.toUpperCase(),
                                                    value: el,
                                                }))}
                                                bind:value={formState.platA}
                                            />
                                        </UFormGroup>

                                        <UCheckbox
                                            bind:value={formState.offline}
                                            label="Offline"
                                        />
                                    </div>
                                    <div class="my-3">
                                        <UButton
                                            class="btn-primary w-full"
                                            type="submit">Fetch nets</UButton
                                        >
                                    </div>
                                </UForm>
                                <TuCard
                                    class="m-auto md:p-4 p-2 my-2 border-md border-card border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh"
                                >
                                    <div class="flex gap-3 justify-center mb-3">
                                        <h1 class="fs-14">Results</h1>
                                    </div>
                                    <div class="grid gap-3">
                                        <div class="flex flex-col gap-3">
                                            <UFormGroup
                                                label={(mstate.platA?.toUpperCase() ??
                                                    "Platform") +
                                                    ` (${mstate.netsA?.length ?? 0})`}
                                            >
                                                <UForm
                                                    onsubmit={(_) =>
                                                        getCoinNets("A")}
                                                >
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
                                                                    ><i
                                                                        class="fi fi-br-search"

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
                                                        .toSorted(
                                                            (a, b) =>
                                                                a.wdFee -
                                                                b.wdFee
                                                        )
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
                                    </div>
                                </TuCard>
                                <UForm onsubmit={submitDepAddr}>
                                    <UFormGroup label="Address">
                                        <UInput
                                            placeholder="Deposit address..."
                                            required
                                            bind:value={addrForm.addr}
                                        />
                                    </UFormGroup>
                                    <UFormGroup label="Memo (TAG)">
                                        <UInput
                                            placeholder="Memo (TAG)..."
                                            bind:value={addrForm.memo}
                                        />
                                    </UFormGroup>
                                    <UFormGroup class="my-2">
                                        <UButton
                                            disabled={!addrForm.addr}
                                            class="btn-primary w-full"
                                            type="submit">Add address</UButton
                                        >
                                    </UFormGroup>
                                </UForm>
                            </div>
                        </TuCard>
                    {/snippet}
                </TuModal>
            </TuTeleport>
        </TuCard>
        <!-- <p>NETSA: {{mstate.netsA?.find(el=> el.coin == mstate.coinA)?.nets}}</p> -->
    </div>
</div>

<style lang="scss">
    .dep-addr-card {
        overflow-x: hidden;
        text-overflow: ellipsis;
        text-wrap: nowrap;
    }
</style>
