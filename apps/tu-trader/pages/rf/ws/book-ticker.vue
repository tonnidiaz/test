<template>
    <div>
        <t-meta :title="`Orderbook | ticker - ${SITE}`" />
        <div class="sm:p-4 p-2">
            <tu-card
                class="md:p-4 p-2 my-2 border-md border-card border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh"
            >
            <div class="flex gap-3 justify-center">
                <UCheckbox label="Killed" :model-value="killed" disabled />
                <UCheckbox label="Connected" :model-value="connected" disabled />

            </div>
                <UForm
                    :on-submit="handleSubmit"
                    class="border-card border-1 rounded-md p-1 py-4 md:p-4 flex flex-col items-center"
                >
                    <div class="flex items-start justify-center gap-3 mb-3">
                        <UFormGroup label="Arbit type">
                            <TuSelect
                                placeholder="Arbit type"
                                :options="
                                    types.map((el) => ({
                                        label: el.toUpperCase(),
                                        value: el,
                                    }))
                                "
                                v-model="formState.type"
                                required
                            />
                        </UFormGroup>
                        <UFormGroup
                            v-if="formState.type == 'tri'"
                            label="Platform"
                        >
                            <TuSelect
                                placeholder="Platform"
                                :options="
                                    plats.map((el) => ({
                                        label: el.toUpperCase(),
                                        value: el,
                                    }))
                                "
                                v-model="formState.platform"
                                required
                            />
                        </UFormGroup>
                        <div v-else class="flex flex-col gap-3">
                            <UFormGroup label="Pair">
                                <TuSelect
                                    v-model="formState.pair"
                                    placeholder="Pair"
                                    :options="
                                        pairs.map((el) => ({
                                            label: el.toString(),
                                            value: el,
                                        }))
                                    "
                                />
                            </UFormGroup>
                            <UFormGroup label="Custom pair">
                                <UInput
                                    name="pair"
                                    placeholder="e.g. SOL/USDT"
                                    v-model="formState.cpair"
                                />
                            </UFormGroup>
                        </div>
                    </div>
                    <div
                        v-if="formState.type == 'cross'"
                        class="mb-3 grid w-full grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                        <UFormGroup label="Platform A">
                            <TuSelect
                                placeholder="Platform A"
                                :options="
                                    plats.map((el) => ({
                                        label: el.toUpperCase(),
                                        value: el,
                                    }))
                                "
                                v-model="formState.platA"
                                required
                            />
                        </UFormGroup>
                        <UFormGroup label="Platform B">
                            <TuSelect
                                placeholder="Platform B"
                                :options="
                                    plats.map((el) => ({
                                        label: el.toUpperCase(),
                                        value: el,
                                    }))
                                "
                                v-model="formState.platB"
                                required
                            />
                        </UFormGroup>
                    </div>

                    <div
                        v-else
                        class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center justify-center mb-3"
                    >
                        <UFormGroup label="Coin A">
                            <UInput
                                v-model="formState.A"
                                name="A"
                                placeholder="e.g USDT"
                                required
                            />
                        </UFormGroup>
                        <UFormGroup label="Coin B">
                            <UInput
                                v-model="formState.B"
                                name="B"
                                placeholder="e.g USDC"
                                required
                            />
                        </UFormGroup>
                        <UFormGroup label="Coin C">
                            <UInput
                                v-model="formState.C"
                                name="C"
                                placeholder="e.g APEX"
                                required
                            />
                        </UFormGroup>
                    </div>
                    <div class="mb-2" v-if="err?.length">
                        <span class="text-error err fs-12">{{ err }}</span>
                    </div>
                    <div
                        class="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full relative"
                    >
                        <UButton type="submit" class="btn-primary w-full"
                            >Sync</UButton
                        >
                        <UButton
                            @click="onStop"
                            type="button"
                            class="btn-error w-full"
                            >STOP</UButton
                        >
                    </div>
                </UForm>
                <div class="my-3 grid grid-cols-1 sm:grid-cols-2 items-center gap-3">
                <div class="flex items-center gap-5 justify-center">
                    <p><b>EST. PERC: </b>{{ state.tickerPerc ?? 0.0 }}%</p>
                    <p><b>EST. FLIPPED-PERC: </b>{{ state.ftickerPerc ?? 0.0 }}%</p>
                </div>
                <div class="flex items-center gap-5 justify-center">
                    <p><b>PERC: </b>{{ state.perc ?? 0.0 }}%</p>
                    <p><b>FLIPPED-PERC: </b>{{ state.fperc ?? 0.0 }}%</p>
                </div>  
                </div>
                
                <table
                    v-if="state.type == 'tri'"
                    class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 table"
                >
                    <thead class="text-xs uppercase bg-base-200 text-gray-400">
                        <tr>
                            <th scope="col" class="px-6 py-3">Side</th>
                            <th scope="col" class="px-6 py-3">
                                Pair A {{ state.pairA }}
                            </th>
                            <th scope="col" class="px-6 py-3">
                                Pair B {{ state.pairB }}
                            </th>
                            <th scope="col" class="px-6 py-3">
                                Pair C {{ state.pairC }}
                            </th>
                        </tr>
                    </thead>
                    <tbody class="font-monospace">
                        <tr class="text-error">
                            <td scope="col">Asks</td>
                            <td scope="col">{{ state.bookA?.ask?.px ?? 0 }}</td>
                            <td scope="col">{{ state.bookB?.ask?.px ?? 0 }}</td>
                            <td scope="col">{{ state.bookC?.ask?.px ?? 0 }}</td>
                        </tr>
                        <tr class="text-success bg-base-300">
                            <td scope="col">Bids</td>
                            <td scope="col">{{ state.bookA?.bid?.px ?? 0 }}</td>
                            <td scope="col">{{ state.bookB?.bid?.px ?? 0 }}</td>
                            <td scope="col">{{ state.bookC?.bid?.px ?? 0 }}</td>
                        </tr>
                        <tr class="text-gray-100 bg-base-300">
                            <td scope="col">Tickers</td>
                            <td scope="col">{{ state.tickerA ?? 0 }}</td>
                            <td scope="col">{{ state.tickerB ?? 0 }}</td>
                            <td scope="col">{{ state.tickerC ?? 0 }}</td>
                        </tr>
                    </tbody>
                </table>
                <table
                    v-else
                    class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 table"
                >
                    <thead class="text-xs uppercase bg-base-200 text-gray-400">
                        <tr>
                            <th scope="col" class="px-6 py-3">Side</th>
                            <th scope="col" class="px-6 py-3">
                                Pltform A [ {{ state.platA }} ] {{ state.pair }}
                            </th>
                            <th scope="col" class="px-6 py-3">
                                Platform B [ {{ state.platB }} ]
                                {{ state.pair }}
                            </th>
                        </tr>
                    </thead>
                    <tbody class="font-monospace">
                        <tr class="text-error">
                            <td scope="col">Asks</td>
                            <td scope="col">{{ state.bookA?.ask?.px ?? 0 }}</td>
                            <td scope="col">{{ state.bookB?.ask?.px ?? 0 }}</td>
                        </tr>
                        <tr class="text-success bg-base-300">
                            <td scope="col">Bids</td>
                            <td scope="col">{{ state.bookA?.bid?.px ?? 0 }}</td>
                            <td scope="col">{{ state.bookB?.bid?.px ?? 0 }}</td>
                        </tr>
                        <tr class="text-gray-100 bg-base-300">
                            <td scope="col">Tickers</td>
                            <td scope="col">{{ state.tickerA ?? 0 }}</td>
                            <td scope="col">{{ state.tickerB ?? 0 }}</td>
                        </tr>
                    </tbody>
                </table>
            </tu-card>
        </div>
    </div>
</template>
<script setup lang="ts">
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
    killed = ref(true), connected = ref(true);
const pairs = ref<string[][]>([]);

const plats = ["binance", "bitget", "bybit", "kucoin", "okx", "mexc"];
const types = ["tri", "cross"];
const formState = reactive<IObj>({
    A: "USDT",
    B: "USDC",
    C: "SUSHI",
    type: types[0],
    platA: "okx",
    platB: "kucoin",
    pair: ["SOL", "USDT"],
});

const bookData = ref<IObj>({});
const handleSubmit = async (e: any) => {
    // e.preventDefault()
    console.log(formState);
    let { platA, platB, pair, platform, cpair } = formState;
    err.value = undefined;
    pair = cpair ? cpair.split("/") : pair;
    if (formState.type == "tri") {
        const instrus = getInstrus(formState.platform);

        const pairA: string[] = [formState.B, formState.A];
        const pairB: string[] = [formState.C, formState.B];
        const pairC: string[] = [formState.C, formState.A];

        if (!instrus.find((el) => el.toString() == pairA.toString())) {
            err.value = `Pair ${pairA} not on ${platform}!!`;
            return console.log(err.value);
        }
        if (!instrus.find((el) => el.toString() == pairB.toString())) {
            err.value = `Pair ${pairB} not on ${platform}!!`;
            return console.log(err.value);
        }
        if (!instrus.find((el) => el.toString() == pairC.toString())) {
            err.value = `Pair ${pairC} not on ${platform}!!`;
            return console.log(err.value);
        }
        _state.value.pairA = pairA;
        _state.value.pairB = pairB;
        _state.value.pairC = pairC;
    } else {
        const instrusA = getInstrus(platA);
        const instrusB = getInstrus(platB);
        if (!instrusA.find((el) => el.toString() == pair.toString())) {
            err.value = `Pair ${pair} not on ${platA}`;
            return console.log(err.value);
        }
        if (!instrusB.find((el) => el.toString() == pair.toString())) {
            err.value = `Pair ${pair} not on ${platB}`;
            return console.log(err.value);
        }
    }
    state.value = { type: formState.type };
    _state.value = {
        ..._state.value,
        ...formState,
        perc: 0,
        fperc: 0,
        tickerPerc: 0, ftickerPerc:0,
        tickerA: 0,
        tickerB: 0,
        tickerC: 0,
        bookA: undefined,
        bookB: undefined,
        bookC: undefined,
        pair,
    };
    _stop();
    const timer = setInterval(() => {
        console.log("NOT YET KILLED");
        if (killed.value) {
            clearInterval(timer);
            socket?.emit("/client-ws/add-bot", {
                ...formState,
                pair,
            });
        }
    }, 500);
};

const _stop = () => {
    killed.value = false;
    console.log("STOPPING...");
    socket?.emit("/client-ws/kill");
};
const onStop = (e) => {
    _stop();
};

const onBook = (data) => {
    console.log("ON BOOK");
    const _state = state.value;
    //console.log({_state})
    killed.value = false
    try {
        if (data.type == "tri") {
            //const _state = state.value;
            console.log({ A: _state.pairA, B: _state.pairB, C: _state.pairC });
            if (data.pairA)
                if (_state.pairA.toString() == data.pairA.toString()) {
                    state.value.bookA = data.bookA;
                }
            if (data.pairB)
                if (_state.pairB.toString() == data.pairB.toString()) {
                    state.value.bookB = data.bookB;
                }

            if (data.pairC)
                if (_state.pairC.toString() == data.pairC.toString()) {
                    state.value.bookC = data.bookC;
                }
        } else {
            if (
                data.pair.toString() == _state.pair.toString() &&
                data.platA == _state.platA &&
                data.platB == _state.platB
            ) {
                state.value.bookA = data.bookA;
                state.value.bookB = data.bookB;
            }
        }

        state.value.perc = data.perc;
        state.value.fperc = data.fperc;

        state.value.tickerPerc = data.tickerPerc;
        state.value.ftickerPerc = data.ftickerPerc;

        state.value.tickerA = data.tickerA
        state.value.tickerB = data.tickerB
        state.value.tickerC = data.tickerC
    } catch (e) {
        console.log(e);
    }
};
const onCreated = async (id) => {
    console.log(`BOT ${id} created`);
    //await sleep(2000);
    //console.log({ state: state.value, _state: _state.value });
    state.value = _state.value;
};
onMounted(() => {
    //initWsTriArbit()
    socket?.on("/client-ws/book", onBook);
    socket?.on("/client-ws/add-bot", onCreated);
    socket?.on("/client-ws/kill", (_) => (killed.value = true));
    socket?.on("disconnect", (r, d) => {
        console.log("IO DISCONNECTED");
        connected.value = false
        msg.value = { msg: "IO DISCONNECTED" };
    });
    socket?.on("connect", () => {
        console.log("IO CONNECTED");
        connected.value = true
        msg.value = { msg: "IO CONNECTED" };
    });
});

onBeforeUnmount(() => {
    _stop();
});
onUnmounted(() => _stop());

watch(
    () => [formState.platA, formState.platB],
    ([pA, pB]) => {
        console.log({ pA, pB });
        if (pA && pB) {
            let instrusA = getInstrus(pA);
            let instrusB = getInstrus(pB);
            instrusA = instrusA.filter((el) =>
                instrusB.map((e) => e.toString()).includes(el.toString())
            );
            instrusB = instrusB.filter((el) =>
                instrusA.map((e) => e.toString()).includes(el.toString())
            );

            pairs.value = instrusA.sort();
        }
    },
    { deep: true, immediate: true }
);
</script>
