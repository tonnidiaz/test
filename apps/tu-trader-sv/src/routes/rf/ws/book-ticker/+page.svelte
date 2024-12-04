<script lang="ts">
    import TMeta from "@/components/TMeta.svelte";
    import TuCard from "@/components/TuCard.svelte";
    import TuSelect from "@/components/TuSelect.svelte";
    import UButton from "@/components/UButton.svelte";
    import UCheckbox from "@/components/UCheckbox.svelte";
    import UForm from "@/components/UForm.svelte";
    import UFormGroup from "@/components/UFormGroup.svelte";
    import UInput from "@/components/UInput.svelte";
    import { SITE, socket } from "@/lib/constants";
    import { getInstrus } from "@cmn/utils/functions";
    import type { IObj } from "@cmn/utils/interfaces";
    import { onDestroy, onMount, untrack } from "svelte";

    let msg = $state<IObj>({});
    let mstate = $state<IObj>({ type: "tri" }),
        _state = $state<IObj>({});
    let err = $state<string>(),
        killed = $state(true),
        connected = $state(true);
    let pairs = $state<string[][]>([]);

    const plats = ["binance", "bitget", "bybit", "kucoin", "okx", "mexc"];
    const types = ["tri", "cross"];
    let formState = $state<IObj>({
        A: "USDT",
        B: "USDC",
        C: "SUSHI",
        type: types[0],
        platA: "okx",
        platB: "kucoin",
        pair: ["SOL", "USDT"],
    });

    let bookData = $state<IObj>({});
    const handleSubmit = async (e: any) => {
        // e.preventDefault()
        console.log(formState);
        let { platA, platB, pair, platform, cpair } = formState;
        err = undefined;
        pair = cpair ? cpair.split("/") : pair;
        if (formState.type == "tri") {
            const instrus = getInstrus(formState.platform);

            const pairA: string[] = [formState.B, formState.A];
            const pairB: string[] = [formState.C, formState.B];
            const pairC: string[] = [formState.C, formState.A];

            if (!instrus.find((el) => el.toString() == pairA.toString())) {
                err = `Pair ${pairA} not on ${platform}!!`;
                return console.log(err);
            }
            if (!instrus.find((el) => el.toString() == pairB.toString())) {
                err = `Pair ${pairB} not on ${platform}!!`;
                return console.log(err);
            }
            if (!instrus.find((el) => el.toString() == pairC.toString())) {
                err = `Pair ${pairC} not on ${platform}!!`;
                return console.log(err);
            }
            _state.pairA = pairA;
            _state.pairB = pairB;
            _state.pairC = pairC;
        } else {
            const instrusA = getInstrus(platA);
            const instrusB = getInstrus(platB);
            if (!instrusA.find((el) => el.toString() == pair.toString())) {
                err = `Pair ${pair} not on ${platA}`;
                return console.log(err);
            }
            if (!instrusB.find((el) => el.toString() == pair.toString())) {
                err = `Pair ${pair} not on ${platB}`;
                return console.log(err);
            }
        }
        mstate = { type: formState.type };
        _state = {
            ..._state,
            ...formState,
            perc: 0,
            fperc: 0,
            tickerPerc: 0,
            ftickerPerc: 0,
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
            if (killed) {
                clearInterval(timer);
                socket?.emit("/client-ws/add-bot", {
                    ...formState,
                    pair,
                });
            }
        }, 500);
    };

    const _stop = () => {
        killed = false;
        console.log("STOPPING...");
        socket?.emit("/client-ws/kill");
    };
    const onStop = (e) => {
        _stop();
    };

    const onBook = (data) => {
        console.log("ON BOOK");
        const _state = mstate;
        //console.log({_state})
        killed = false;
        try {
            if (data.type == "tri") {
                //const _state = state;
                console.log({
                    A: _state.pairA,
                    B: _state.pairB,
                    C: _state.pairC,
                });
                if (data.pairA)
                    if (_state.pairA.toString() == data.pairA.toString()) {
                        mstate.bookA = data.bookA;
                    }
                if (data.pairB)
                    if (_state.pairB.toString() == data.pairB.toString()) {
                        mstate.bookB = data.bookB;
                    }

                if (data.pairC)
                    if (_state.pairC.toString() == data.pairC.toString()) {
                        mstate.bookC = data.bookC;
                    }
            } else {
                if (
                    data.pair.toString() == _state.pair.toString() &&
                    data.platA == _state.platA &&
                    data.platB == _state.platB
                ) {
                    mstate.bookA = data.bookA;
                    mstate.bookB = data.bookB;
                }
            }

            mstate.perc = data.perc;
            mstate.fperc = data.fperc;

            mstate.tickerPerc = data.tickerPerc;
            mstate.ftickerPerc = data.ftickerPerc;

            mstate.tickerA = data.tickerA;
            mstate.tickerB = data.tickerB;
            mstate.tickerC = data.tickerC;
        } catch (e) {
            console.log(e);
        }
    };
    const onCreated = async (id) => {
        console.log(`BOT ${id} created`);
        //await sleep(2000);
        //console.log({ state: state, _state: _state });
        mstate = _state;
    };
    onMount(() => {
        //initWsTriArbit()
        socket?.on("/client-ws/book", onBook);
        socket?.on("/client-ws/add-bot", onCreated);
        socket?.on("/client-ws/kill", (_) => (killed = true));
        socket?.on("disconnect", (r, d) => {
            console.log("IO DISCONNECTED");
            connected = false;
            msg = { msg: "IO DISCONNECTED" };
        });
        socket?.on("connect", () => {
            console.log("IO CONNECTED");
            connected = true;
            msg = { msg: "IO CONNECTED" };
        });

        return () => {
            _stop();
        };
    });

    onDestroy(() => _stop());

    $effect(() => {
        // watch formState.platA, formState.platB
        const pA = formState.platA,
            pB = formState.platB;
        console.log({ pA, pB });

        untrack(() => {
            if (pA && pB) {
                let instrusA = getInstrus(pA);
                let instrusB = getInstrus(pB);
                instrusA = instrusA.filter((el) =>
                    instrusB.map((e) => e.toString()).includes(el.toString())
                );
                instrusB = instrusB.filter((el) =>
                    instrusA.map((e) => e.toString()).includes(el.toString())
                );

                pairs = instrusA.sort();
            }
        });
    });
</script>

<div>
    <TMeta title={`Orderbook | ticker - ${SITE}`} />
    <div class="sm:p-4 p-2">
        <TuCard
            class="md:p-4 p-2 my-2 border-md border-card border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh"
        >
            <div class="flex gap-3 justify-center">
                <UCheckbox label="Killed" value={killed} disabled />
                <UCheckbox label="Connected" value={connected} disabled />
            </div>
            <UForm
                onsubmit={handleSubmit}
                class="border-card border-1 rounded-md p-1 py-4 md:p-4 flex flex-col items-center"
            >
                <div class="flex items-start justify-center gap-3 mb-3">
                    <UFormGroup label="Arbit type">
                        <TuSelect
                            placeholder="Arbit type"
                            options={types.map((el) => ({
                                label: el.toUpperCase(),
                                value: el,
                            }))}
                            bind:value={formState.type}
                            required
                        />
                    </UFormGroup>
                    {#if formState.type == "tri"}
                        <UFormGroup label="Platform">
                            <TuSelect
                                placeholder="Platform"
                                options={plats.map((el) => ({
                                    label: el.toUpperCase(),
                                    value: el,
                                }))}
                                bind:value={formState.platform}
                                required
                            />
                        </UFormGroup>
                    {:else}
                        <div class="flex flex-col gap-3">
                            <UFormGroup label="Pair">
                                <TuSelect
                                    bind:value={formState.pair}
                                    placeholder="Pair"
                                    options={pairs.map((el) => ({
                                        label: el.toString(),
                                        value: el,
                                    }))}
                                />
                            </UFormGroup>
                            <UFormGroup label="Custom pair">
                                <UInput
                                    name="pair"
                                    placeholder="e.g. SOL/USDT"
                                    bind:value={formState.cpair}
                                />
                            </UFormGroup>
                        </div>
                    {/if}
                </div>
                {#if formState.type == "cross"}
                    <div
                        class="mb-3 grid w-full grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                        <UFormGroup label="Platform A">
                            <TuSelect
                                placeholder="Platform A"
                                options={plats.map((el) => ({
                                    label: el.toUpperCase(),
                                    value: el,
                                }))}
                                bind:value={formState.platA}
                                required
                            />
                        </UFormGroup>
                        <UFormGroup label="Platform B">
                            <TuSelect
                                placeholder="Platform B"
                                options={plats.map((el) => ({
                                    label: el.toUpperCase(),
                                    value: el,
                                }))}
                                bind:value={formState.platB}
                                required
                            />
                        </UFormGroup>
                    </div>
                {:else}
                    <div
                        class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center justify-center mb-3"
                    >
                        <UFormGroup label="Coin A">
                            <UInput
                                bind:value={formState.A}
                                name="A"
                                placeholder="e.g USDT"
                                required
                            />
                        </UFormGroup>
                        <UFormGroup label="Coin B">
                            <UInput
                                bind:value={formState.B}
                                name="B"
                                placeholder="e.g USDC"
                                required
                            />
                        </UFormGroup>
                        <UFormGroup label="Coin C">
                            <UInput
                                bind:value={formState.C}
                                name="C"
                                placeholder="e.g APEX"
                                required
                            />
                        </UFormGroup>
                    </div>
                {/if}

                {#if err?.length}
                    <div class="mb-2">
                        <span class="text-error err fs-12">{err}</span>
                    </div>
                {/if}

                <div
                    class="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full relative"
                >
                    <UButton type="submit" class="btn-primary w-full"
                        >Sync</UButton
                    >
                    <UButton
                        onclick={onStop}
                        type="button"
                        class="btn-error w-full">STOP</UButton
                    >
                </div>
            </UForm>
            <div
                class="my-3 grid grid-cols-1 sm:grid-cols-2 items-center gap-3"
            >
                <div class="flex items-center gap-5 justify-center">
                    <p><b>EST. PERC: </b>{mstate.tickerPerc ?? 0.0}%</p>
                    <p>
                        <b>EST. FLIPPED-PERC: </b>{mstate.ftickerPerc ?? 0.0}%
                    </p>
                </div>
                <div class="flex items-center gap-5 justify-center">
                    <p><b>PERC: </b>{mstate.perc ?? 0.0}%</p>
                    <p><b>FLIPPED-PERC: </b>{mstate.fperc ?? 0.0}%</p>
                </div>
            </div>

            {#if mstate.type == "tri"}
                <table
                    class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 table"
                >
                    <thead class="text-xs uppercase bg-base-200 text-gray-400">
                        <tr>
                            <th scope="col" class="px-6 py-3">Side</th>
                            <th scope="col" class="px-6 py-3">
                                Pair A {mstate.pairA}
                            </th>
                            <th scope="col" class="px-6 py-3">
                                Pair B {mstate.pairB}
                            </th>
                            <th scope="col" class="px-6 py-3">
                                Pair C {mstate.pairC}
                            </th>
                        </tr>
                    </thead>
                    <tbody class="font-monospace">
                        <tr class="text-error">
                            <td>Asks</td>
                            <td>{mstate.bookA?.ask?.px ?? 0}</td>
                            <td>{mstate.bookB?.ask?.px ?? 0}</td>
                            <td>{mstate.bookC?.ask?.px ?? 0}</td>
                        </tr>
                        <tr class="text-success bg-base-300">
                            <td>Bids</td>
                            <td>{mstate.bookA?.bid?.px ?? 0}</td>
                            <td>{mstate.bookB?.bid?.px ?? 0}</td>
                            <td>{mstate.bookC?.bid?.px ?? 0}</td>
                        </tr>
                        <tr class="text-gray-100 bg-base-300">
                            <td>Tickers</td>
                            <td>{mstate.tickerA ?? 0}</td>
                            <td>{mstate.tickerB ?? 0}</td>
                            <td>{mstate.tickerC ?? 0}</td>
                        </tr>
                    </tbody>
                </table>
            {:else}
                <table
                    class="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 table"
                >
                    <thead class="text-xs uppercase bg-base-200 text-gray-400">
                        <tr>
                            <th scope="col" class="px-6 py-3">Side</th>
                            <th scope="col" class="px-6 py-3">
                                Pltform A [ {mstate.platA} ] {mstate.pair}
                            </th>
                            <th scope="col" class="px-6 py-3">
                                Platform B [ {mstate.platB} ]
                                {mstate.pair}
                            </th>
                        </tr>
                    </thead>
                    <tbody class="font-monospace">
                        <tr class="text-error">
                            <td>Asks</td>
                            <td>{mstate.bookA?.ask?.px ?? 0}</td>
                            <td>{mstate.bookB?.ask?.px ?? 0}</td>
                        </tr>
                        <tr class="text-success bg-base-300">
                            <td>Bids</td>
                            <td>{mstate.bookA?.bid?.px ?? 0}</td>
                            <td>{mstate.bookB?.bid?.px ?? 0}</td>
                        </tr>
                        <tr class="text-gray-100 bg-base-300">
                            <td>Tickers</td>
                            <td>{mstate.tickerA ?? 0}</td>
                            <td>{mstate.tickerB ?? 0}</td>
                        </tr>
                    </tbody>
                </table>
            {/if}
        </TuCard>
    </div>
</div>
