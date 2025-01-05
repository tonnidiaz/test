<script lang="ts">
    import CointestTable from "@/components/CointestTable.svelte";
    import TMeta from "@/components/TMeta.svelte";
    import TuDatePicker from "@/components/TuDatePicker.svelte";
    import TuModalContainer from "@/components/TuModalContainer.svelte";
    import TuSelect from "@/components/TuSelect.svelte";
    import TuStats from "@/components/TuStats.svelte";
    import UButton from "@/components/UButton.svelte";
    import UCheckbox from "@/components/UCheckbox.svelte";
    import UDivider from "@/components/UDivider.svelte";
    import UForm from "@/components/UForm.svelte";
    import UFormGroup from "@/components/UFormGroup.svelte";
    import UInput from "@/components/UInput.svelte";
    import {
        SITE,
        selectPlatforms,
        selectIntervals,
        selectParents,
        socket,
    } from "@/lib/constants";
    import { formatter, toSelectStrategies } from "@/lib/funcs";
    import { appStore, setStrategies } from "@/stores/app.svelte";
    import { parseDate } from "@cmn/utils/functions";
    import type { IObj } from "@cmn/utils/interfaces";
    import { onMount } from "svelte";

    let msg = $state<IObj>({}),
        paramsAreaRef = $state<any>(),
        clId = $state(""),
        paramsAreaOpen = $state(true);

    const margins = [1, 2, 3, 4, 5].map((e) => ({ label: `x${e}`, value: e }));

    const { parents, platforms, strategies } = $derived(appStore);
    const initRes = { data: {} };
    let res = $state<IObj>(initRes);
    let formState = $state<IObj>({
        strategy: 8,
        interval: 60,
        bal: 50,
        offline: true,
        prefix: "DEF",
        lev: 1,
        save: true,
        skip_existing: false,
        skip_saved: false,
        fix_invalid: false,
        useFile: false,
        platform: "binance",
        parent: "cloud5",
        demo: false,
        show: false,
        from_last: false,
        symbol: ["SOL", "USDT"].toString(),

        date: {
            start: "2024-01-01 00:00:00",
            end: "2024-10-28 23:59:00",
        },
    });
   

    onMount(() => {
        //Check for saved state
        const state = sessionStorage.getItem(`${location.pathname}__state`);
        if (state) {
            formState = JSON.parse(state);
        }
    });
 $effect(() => {
        sessionStorage.setItem(
            `${location.pathname}__state`,
            JSON.stringify(formState)
        );
    });
    const defState = {
        interval: 0,
        platform: "",
        parent: "",
        strategy: "",
        pre: "",
    };
    let summary = $state(""),
        _state = $state(defState);

    const parseData = (data: IObj) => {
        return data.data;
        let dataKeys = Object.keys(data.data);
        const dataLength = dataKeys.length;
        const max = 2000;
        dataKeys =
            dataLength > max + 1
                ? [
                      ...dataKeys.slice(0, max),
                      ...dataKeys.slice(dataLength - 50, dataLength),
                  ]
                : dataKeys;
        let d = dataKeys.map((ts, i) => {
            let obj = data.data[ts];
            const _side = obj.side.toLowerCase();
            const isSell = _side.startsWith("sell");
            obj = {
                ...obj,
                i: `${dataKeys.indexOf(ts)}`,
                side: {
                    value: obj.side.toUpperCase(),
                    class: obj.balance
                        ? isSell
                            ? "!text-error"
                            : "!text-success"
                        : "!text-white",
                },
                balance: `${!isSell ? data.base : data.ccy} ${
                    obj.balance ?? "N/A"
                }\t${obj.profit ?? ""}`,
                class: `${isSell ? "bg-base-200" : ""} ${
                    !obj.balance ? "linethrough bg-red-500" : ""
                }`,
            };
            return obj;
        });
        return d;
    };

    const copy = (_alert = false) => {
        try {
            navigator.clipboard.writeText(summary);
            const msg = "COPIED TO CLIPBORAD";
            if (_alert) {
                alert(msg);
            }

            console.log(msg);
        } catch (e) {
            console.log(e);
        }
    };

    const onCointest = (data: any) => {
        console.log("ON BACKTEST");

        if (data.data && data.clId == clId) {
            const _data = data.data;
            res = { data: _data, platform: data.platform };
            // console.log(_data);
            // const profit = formatter.format(_data.profit ?? 0);
            // const aside = formatter.format(_data.aside ?? 0);

            // const pair = `${_data.base}-${_data.ccy}`;
            // const txt = `[${_data.trades}] [${pair}] [${
            //     _data.str_name
            // }]: ${aside.replace("$", "")} | ${profit.replace("$", "")}`;
            // summary.value = txt;
            // copy();
            msg = {};
        } else if (!data.data) {
            if (data.err) {
                msg.value = { msg: data.err, err: true };
            } else {
                res = initRes;
                console.log(data);
                msg = { msg: data };
            }
        }
    };

    onMount(() => {
        socket?.on("cointest", onCointest);
        socket?.on("disconnect", (r, d) => {
            console.log("IO DISCONNECTED");
            msg = { msg: "IO DISCONNECTED" };
        });
        socket?.on("connect", () => {
            console.log("IO CONNECTED");
            msg = { msg: "IO CONNECTED" };
        });
    });

    const handleSubmit = async (e: any) => {
        try {
            clId = `${Date.now()}`;
            const { csymbol, lev, symbol, only, date, interval, strategy } =
                formState;
            let fd: IObj = {
                ...formState,
                strategy: strategy,
                lev: lev,
                symbol:
                    csymbol && csymbol.length
                        ? csymbol.split("/")
                        : symbol.split(","),
                only: only?.split("/"),
                interval: interval,
                clId: clId,
                ...date,
            };
            delete fd["date"];
            fd = { ...fd, start: parseDate(fd.start), end: parseDate(fd.end) };
            console.log(fd);
            _state = {
                ..._state,
                platform: fd.platform,
                interval: fd.interval,
                parent: fd.parent,
                pre: fd.prefix,
                strategy: strategies[fd.strategy - 1].name,
            };
            //msg.value = {msg: "GETTING KLINES..."};
            socket?.emit("cointest", fd);
            /* const ret = await api().post('/cointest', fd)
        
        if (ret.data.err){
            msg.value = { msg: ret.data.err, err: true };
            return
        }
        console.log(ret.data); */
        } catch (e) {
            console.log(e);
        }
    };

    onMount(() => {
        socket?.on("strategies", ({ data, err }) => {
            if (err) {
                console.log(err);
                return;
            }
            setStrategies(data);
            console.log("GOT THE STRATEGIES");
        });
    });
</script>

<div>
    <TMeta title={`Coin test - ${SITE}`} />
    <div class="w-100p h-100p relative md:p-5 p-2 flex flex-col">
        <div
            class="md:p-4 p-2 my-2 border-md border-card border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh"
        >
            <h2 class="font-bold fs-20">
                COIN-TEST RESULTS
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <span
                    onclick={() => {
                        copy(true);
                    }}
                    class="btn pointer rounded-full btn-md btn-ghost"
                    ><i class="fi fi-rr-copy"></i></span
                >
            </h2>

            <div class="flex flex-col">
                {#if _state.interval}
                    <TuStats
                        class="justify-start items-start"
                        stats={[
                            {
                                title: "Summary",
                                subtitle: `[${_state.platform}] ${_state.interval}m: [${_state.parent}] [${_state.strategy}] ${_state.pre}_`,
                            },
                        ]}
                    />
                {/if}

                <div class="my-2 flex gap-10 justify-center hidden">
                    <TuStats
                        stats={[
                            { title: "Trades", subtitle: res.trades ?? 0 },
                            {
                                title: "Profit",
                                subtitle: `${res.ccy ?? ""} ${formatter
                                    .format(res.profit ?? 0)
                                    .replace("$", "")}`,
                                hover: `${formatter
                                    .format((res.profit ?? 0) * 18)
                                    .replace("$", "R")}`,
                                //hover: numToWords(Math.round(res.profit ?? 0)),
                            },
                            {
                                title: "W",
                                subtitle: `${(res.gain ?? 0).toFixed(2)}%`,
                            },
                            {
                                title: "L",
                                subtitle: `${(res.loss ?? 0).toFixed(2)}%`,
                            },
                        ]}
                    />
                </div>
            </div>

            <div class="mt-4 oy-">
                <CointestTable rows={parseData(res)} />
            </div>
        </div>
        <TuModalContainer bind:open={paramsAreaOpen}>
            <div>
                <div class="h-100p oy-hidden relative">
                    <div
                        class="flex justify-between items-center w-100p p-2 gap-2"
                    >
                        <span>{formState?.symbol}</span>
                        <UButton
                            onclick={(_) => (paramsAreaOpen = !paramsAreaOpen)}
                            class="ctrl-btn btn-primary mb-2"
                        >
                            <i class="fi fi-rr-angle-down"></i>
                        </UButton>
                    </div>

                    <div class="content">
                        <UDivider class="mb-7 mt-2" />
                        <UForm
                            id="form"
                            class="space-y-5 flex flex-col items-center"
                            onsubmit={handleSubmit}
                        >
                            <div
                                class="w-full grid grid-cols-2 gap-4 items-center"
                            >
                                <TuSelect
                                    placeholder="Platform"
                                    options={selectPlatforms(platforms)}
                                    bind:value={formState.platform}
                                    required
                                />

                                <div class="flex items-center gap-2">
                                    <UFormGroup>
                                        <UCheckbox
                                            color="primary"
                                            label="Offline"
                                            bind:value={formState.offline}
                                        />
                                    </UFormGroup>
                                    <UFormGroup>
                                        <UCheckbox
                                            color="primary"
                                            label="Use file"
                                            bind:value={formState.useFile}
                                        />
                                    </UFormGroup>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <UInput
                                    required={formState.useFile}
                                    type="file"
                                    class="file-input file-input-bordered file-input-sm"
                                    override="class"
                                    onchange={(e) => (formState.file = e[0])}
                                />
                            </div>
                            <div class="flex items-center gap-3 justify-center">
                                <UCheckbox
                                    color="primary"
                                    label="Parsed"
                                    bind:value={formState.isParsed}
                                />
                                <UCheckbox
                                    color="primary"
                                    label="Save"
                                    bind:value={formState.save}
                                />

                                <UCheckbox
                                    color="primary"
                                    label="Heikin-ashi"
                                    bind:value={formState.isHa}
                                />
                            </div>
                            <div class="flex items-center gap-2">
                                <UCheckbox
                                    color="primary"
                                    label="Demo"
                                    bind:value={formState.demo}
                                />
                                <UCheckbox
                                    color="primary"
                                    label="Skip Existing"
                                    bind:value={formState.skip_existing}
                                />
                                <UCheckbox
                                    color="primary"
                                    label="Skip Saved"
                                    bind:value={formState.skip_saved}
                                />
                            </div>
                            <div class="flex items-center gap-2">
                                <UCheckbox
                                    color="primary"
                                    label="Join"
                                    bind:value={formState.from_last}
                                />
                                <UCheckbox
                                    color="primary"
                                    label="Fix invalid"
                                    bind:value={formState.fix_invalid}
                                />
                                <UCheckbox
                                    color="primary"
                                    label="Just show"
                                    variant="primary
                            "
                                    v-model="formState.show"
                                />
                                <UCheckbox
                                    color="primary"
                                    label="Use invalid"
                                    bind:value={formState.useInvalid}
                                />
                            </div>
                            <div
                                class="flex items-center gap-4 w-full justify-center"
                            >
                                <div class="flex items-center gap-1">
                                    <TuSelect
                                        class="flex-1"
                                        searchable
                                        innerHint="Search strategy..."
                                        placeholder="Strategy"
                                        showLabel
                                        options={toSelectStrategies(strategies)}
                                        bind:value={formState.strategy}
                                        required
                                    />
                                    <div
                                        class="flex flex-col gap- items-center"
                                    >
                                        <UButton
                                            onclick={(_) =>
                                                socket?.emit("strategies")}
                                            class="btn-xs btn-sm btn-ghost rounded-full"
                                        >
                                            <span
                                                ><i class="fi fi-rr-refresh"
                                                ></i></span
                                            >
                                        </UButton>
                                        <!-- svelte-ignore a11y_consider_explicit_label -->
                                        <a
                                            target="_blank"
                                            title="More info on strategies"
                                            href="/utils/strategies"
                                            class="btn btn-sm btn-ghost rounded-full"
                                        >
                                            <span
                                                class="text-primary text-center"
                                                ><i
                                                    class="fi fi-br-interrogation"
                                                ></i></span
                                            >
                                        </a>
                                    </div>
                                </div>

                                <TuSelect
                                    placeholder="Interval"
                                    showLabel
                                    options={selectIntervals}
                                    bind:value={formState.interval}
                                    required
                                />
                                <TuSelect
                                    placeholder="Parent"
                                    showLabel
                                    options={selectParents(parents)}
                                    bind:value={formState.parent}
                                    required
                                />
                            </div>
                            <div class="flex items-end justify-center gap-4">
                                <UFormGroup label="Start balance">
                                    <UInput
                                        type="text"
                                        placeholder="Enter start balance..."
                                        required
                                        bind:value={formState.bal}
                                    />
                                </UFormGroup>
                                <UFormGroup
                                    label="ONLY"
                                    title="WILL ONLY DO THIS ONE PAIR"
                                    ><UInput
                                        placeholder="e.g ETH/USDT"
                                        bind:value={formState.only}
                                        name="only"
                                    ></UInput></UFormGroup
                                >
                            </div>
                            <div class="flex items-end justify-center gap-4">
                                <UFormGroup label="Prefix"
                                    ><UInput
                                        placeholder="e.g def"
                                        bind:value={formState.prefix}
                                        name="prefix"
                                    ></UInput></UFormGroup
                                >
                                <UFormGroup label="Quote"
                                    ><UInput
                                        placeholder="e.g USDT"
                                        bind:value={formState.quote}
                                        name="quote"
                                    ></UInput></UFormGroup
                                >
                            </div>

                            <div class="flex justify-center">
                                <UFormGroup>
                                    <TuDatePicker bind:value={formState.date} />
                                </UFormGroup>
                            </div>
                            {#if msg.msg}
                                <div
                                    class="my-2 text-center p-2 bg-base-200 fs-14 border-card -1 br-5 w-full wp-wrap"
                                >
                                    <span>{msg.msg}</span>
                                </div>
                            {/if}
                        </UForm>
                    </div>
                    <div class="p-3">
                        <UButton
                            form="form"
                            type="submit"
                            class="w-full btn-primary"
                        >
                            Start
                        </UButton>
                    </div>
                </div>
            </div>
        </TuModalContainer>
    </div>
</div>
