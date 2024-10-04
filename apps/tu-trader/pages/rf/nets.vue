<template>
    <div>
        <t-meta :title="`Networks - ${SITE}`" />
        <div class="sm:p-4 p-2">
            <tu-card
                class="md:p-4 p-2 my-2 h-80vh border-md border-card border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh"
            >
                <div class="flex gap-3 justify-center mb-3">
                    <h1 class="fs-14">Networks</h1>
                </div>
                <UForm
                    :on-submit="handleSubmit"
                    class="border-card border-1 rounded-md p-1 md:p-4 flex flex-col items-center"
                >
                    <div class="flex items-start justify-center gap-3 mb-3">
                        <UFormGroup label="Platform A">
                            <TuSelect
                                placeholder="PlatA"
                                :options="
                                    plats.map((el) => ({
                                        label: el.toUpperCase(),
                                        value: el,
                                    }))
                                "
                                v-model="formState.platA"
                            />
                        </UFormGroup>
                        <UFormGroup label="Platform B">
                            <TuSelect
                                placeholder="PlatB"
                                :options="
                                    plats.map((el) => ({
                                        label: el.toUpperCase(),
                                        value: el,
                                    }))
                                "
                                v-model="formState.platB"
                            />
                        </UFormGroup>
                        <UCheckbox
                            v-model="formState.offline"
                            label="Offline"
                        />
                    </div>
                    <div class="my-3">
                        <UButton class="btn-primary w-full" type="submit"
                            >Submit</UButton
                        >
                    </div> </UForm
                ><tu-card
                    class="m-auto md:p-4 p-2 my-2 border-md border-card max-w-550 min-w-500 border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh"
                >
                    <div class="flex gap-3 justify-center mb-3">
                        <h1 class="fs-14">Results</h1>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div class="flex flex-col gap-3">
                            <UFormGroup
                                :label="
                                    (state.platA?.toUpperCase() ??
                                        'Platform A') +
                                    ` (${state.netsA?.length ?? 0})`
                                "
                            >
                                <UForm
                                    :on-submit="
                                        async () => {
                                            try {
                                                const nets = state.netsA?.find(
                                                    (el) =>
                                                        el.coin == state._coinA
                                                );
                                                state.coinA = nets;
                                                state.chainA = undefined;
                                                if (nets) {
                                                    state.chainA =
                                                        nets.nets[0]?.chain;
                                                }
                                            } catch (e) {
                                                console.log(e);
                                            }
                                        }
                                    "
                                >
                                    <label
                                        class="flex items-center gap-2 input input-bordered"
                                        :label="
                                            state.platA?.toUpperCase() ??
                                            'Platform A'
                                        "
                                    >
                                        Coin
                                        <input
                                            v-model="state._coinA"
                                            placeholder="e.g SOL"
                                            name="coin"
                                        />
                                        <UButton type="submit" class="btn-ghost"
                                            ><i class="fi fi-br-search"></i
                                        ></UButton>
                                    </label>
                                </UForm>
                            </UFormGroup>
                            <div class="">
                                <b>Coin:</b>
                                <span v-if="state.coinA">
                                    [{{ state.coinA.coin }}]
                                    {{ state.coinA.name }}
                                </span>
                                <span v-else> -- -- --</span>
                            </div>
                            <UFormGroup :label="'Network'">
                                <TuSelect placeholder="Network" :options="
                                state.coinA?.nets .sort((a, b) => a.wdFee -
                                b.wdFee) .map((el) => ({ html: netHtml(el), class: 'even:text-primary', value: el.chain,
                                })) ?? [] " v-model="state.chainA" />
                            </UFormGroup>
                            <div v-if="state.netA" class="flex justify-between px-3 gap-3 items-center fw-6 font-monospace">
                                <span>Con. addr:</span>
                                <span class="text-secondary">...{{ state.netA.contractAddr?.slice(CONTR_ADDR_LEN)}}</span>
                            </div>
                        </div>
                        <div class="flex flex-col gap-3">  
                            <UFormGroup
                                :label="
                                    (state.platB?.toUpperCase() ??
                                        'Platform B') +
                                    ` (${state.netsB?.length ?? 0})`
                                "
                            >
                                <UForm
                                    :on-submit="
                                        async () => {
                                            try {
                                                const nets = state.netsB?.find(
                                                    (el) =>
                                                        el.coin == state._coinB
                                                );
                                                state.coinB = nets;
                                                state.chainB = undefined;
                                                if (nets) {
                                                    state.chainB =
                                                        nets.nets[0]?.chain;
                                                }
                                            } catch (e) {
                                                console.log(e);
                                            }
                                        }
                                    "
                                >
                                    <label
                                        class="flex items-center gap-2 input input-bordered"
                                    >
                                        Coin
                                        <input
                                            v-model="state._coinB"
                                            placeholder="e.g SOL"
                                            name="coin"
                                        />
                                        <UButton type="submit" class="btn-ghost"
                                            ><i class="fi fi-br-search"></i
                                        ></UButton>
                                    </label>
                                </UForm>
                            </UFormGroup>
                            <div class="">
                                <b>Coin:</b>
                                <span v-if="state.coinB">
                                    [{{ state.coinB.coin }}]
                                    {{ state.coinB.name }}
                                </span>
                                <span v-else> -- -- --</span>
                            </div>
                            <UFormGroup :label="'Network'">
                                <TuSelect
                                    placeholder="Network"
                                    :options="
                                        state.coinB?.nets
                                            .sort((a, b) => a.wdFee - b.wdFee)
                                            .map((el) => ({
                                                html: netHtml(el),
                                                value: el.chain,
                                            })) ?? []
                                    "
                                    v-model="state.chainB"
                                />
                            </UFormGroup>
                            <div v-if="state.netB" class="flex justify-between px-3 gap-3 items-center fw-6 font-monospace">
                                <span>Con. addr:</span>
                                <span class="text-secondary">...{{ state.netB.contractAddr?.slice(CONTR_ADDR_LEN)}}</span>
                            </div>
                        </div>
                    </div>
                </tu-card>
            </tu-card>
            <!-- <p>NETSA: {{state.netsA?.find(el=> el.coin == state.coinA)?.nets}}</p> -->
        </div>
    </div>
</template>
<script setup lang="ts">
import { el } from "date-fns/locale";
import { ref, reactive, watch } from "vue";
import type { IObj } from "~/utils/interfaces";

const msg = ref<IObj>({}),
    paramsAreaOpen = ref(true),
    clId = ref("");
/**
 * Display triangular-arbitrage percentage
 * Display asks/bids A-C
 */

const state = ref<IObj>({ type: "tri" }),
    _state = ref<IObj>({});
const err = ref<string>(),
    killed = ref(true),
    connected = ref(true);
const pairs = ref<string[][]>([]);
const nets = ref<IObj[]>([]);
const CONTR_ADDR_LEN = -7
const plats = ["binance", "bitget", "bybit", "kucoin", "okx", "mexc"];
const types = ["tri", "cross"];
const formState = reactive<IObj>({
    platA: "kucoin",
    platB: "bitget",
    offline: true,
    pair: ["SOL", "USDT"],
});

const handleSubmit = async (e) => {
    try {
        const { platA, platB, offline } = formState;
        console.log({ offline });

        if (platA) {
            state.value = {
                ...state.value,
                platA: undefined,
                coinA: undefined,
                netsA: undefined,
                netA: undefined,
            };
            const res = await api().get("/rf/nets", {
                params: {
                    plat: platA,
                    offline,
                },
            });
            state.value.platA = platA;
            state.value.netsA = res.data;
        }
        if (platB) {
            state.value = {
                ...state.value,
                platB: undefined,
                coinB: undefined,
                netsB: undefined,
                netB: undefined,
            };
            const res = await api().get("/rf/nets", {
                params: {
                    plat: platB,
                    offline,
                },
            });
            state.value.platB = platB;
            state.value.netsB = res.data;
        }
    } catch (err) {}
};


const netHtml = (el: IObj)=>{
    return `<div><div>${el.chain}</div><div class="font-monospace">fee: ${el.wdFee}</div><div class="flex items-center gap-2 justify-between w-full"><span class="font-monospace fs-12 fw-6 text-${el.canDep ? 'white' : 'gray-500'}">Dep</span><span class="font-monospace fs-12 fw-6 text-${el.canWd ? 'white' : 'gray-500'}">Wid</span></div></div>`
}

watch(()=>[state.value.chainA, state.value.chainB], ([cA, cB])=>{
        state.value.netA = state.value.coinA?.nets.find(el=> el.chain == cA)
        state.value.netB = state.value.coinB?.nets.find(el=> el.chain == cB)
})
</script>
