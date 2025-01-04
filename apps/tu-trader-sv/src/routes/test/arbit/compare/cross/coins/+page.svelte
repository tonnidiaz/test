<script lang="ts">
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
        selectIntervals,
        selectPlatforms,
        selectSymbols,
        socket,
    } from "@/lib/constants";
    import { formatter, toSelectStrategies } from "@/lib/funcs";
    import { parseDate } from "@cmn/utils/functions";
    import { appStore } from "@/stores/app.svelte";
    import type { IObj } from "@cmn/utils/interfaces";
    import { onMount, untrack } from "svelte";
    import CointestTable from "@/components/CointestTable.svelte";
    import ArbitTable from "@/components/ArbitTable.svelte";

    const initRes = { data: {} };
    let res = $state<IObj>(initRes);
    const { strategies, platforms, parents } = $derived(appStore);
    let msg = $state<IObj>({}),
        paramsAreaOpen = $state(true),
        clId = $state("");

    const margins = [1, 2, 3, 4, 5].map((e) => ({ label: `x${e}`, value: e }));

    let formState = $state<{ [key: string]: any | undefined }>({
        interval: 60,
        bal: 50,
        offline: true,
        prefix: undefined,
        save: true,
        skip_existing: false,
        skip_saved: false,
        fix_invalid: false,
        useFile: false,
        platA: "okx",
        platB: "bybit",
        demo: false,
        show: false,
        from_last: false,
        save_klines: true,
        strNum: 6,
        date: {
            start: "2024-01-01 00:00:00",
            end: "2024-10-28 23:59:00",
        },
    });

    let defState = {
        interval: 0,
        platA: "",
        platB: "",
        pre: "",
        show_details: false,
        klinesPrefixLinked: true,
    };
    let summary = $state(""),
        _state = $state(defState);

    const ep = "cross-compare-arbit-cointest";
    const getData = (ts: string) => res.data[ts];
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
        console.log("ON DATA");
        console.log({ clId: clId });
        console.log(data);

        if (data.data && data.clId == clId) {
            const _data = data.data;
            res = {
                data: _data,
                plat: data.plat,
                orders: data.orders,
                trades: _data[0].trades,
                profit: _data[0].profit,
                w: _data[0].w,
                l: _data[0].l,
            };
            // console.log(_data);
            // const profit = formatter.format(_data.profit ?? 0);
            // const aside = formatter.format(_data.aside ?? 0);

            // const pair = `${_data.base}-${_data.ccy}`;
            // const txt = `[${_data.trades}] [${pair}] [${
            //     _data.str_name
            // }]: ${aside.replace("$", "")} | ${profit.replace("$", "")}`;
            // summary = txt;
            // copy();
            console.log(data);
            msg = {};
        } else if (!data.data) {
            if (data.err) {
                msg = { msg: data.err, err: true };
            } else if (typeof data == "string") {
                res = initRes;
                msg = { msg: data };
            }
        }
    };

    onMount(() => {
        socket?.on(ep, onCointest);
        socket?.on("disconnect", (r, d) => {
            console.log("IO DISCONNECTED");
            msg = { msg: "IO DISCONNECTED" };
        });
        socket?.on("connect", () => {
            console.log("IO CONNECTED");
            msg = { msg: "IO CONNECTED" };
        });

        // Update state
        const _formState = sessionStorage.getItem(`${location.pathname}__formstate`);
        if (_formState) {
            formState = JSON.parse(_formState);
        }
        const __state = sessionStorage.getItem(`${location.pathname}__state`);
        if (__state) {
            _state = JSON.parse(__state);
        }
    });

    

    const handleSubmit = async (e: any) => {
        try {
            clId = `${Date.now()}`;
            let fd: IObj = {
                ...formState,
                only: formState.cOnly
                    ? formState.cOnly.split("/")
                    : formState.only
                      ? formState.only.split(",")
                      : undefined,
                clId: clId,
                ...formState.date,
            };
            delete fd["date"];
            fd = { ...fd, start: parseDate(fd.start), end: parseDate(fd.end) };
            console.log(fd);
            _state = {
                ..._state,
                interval: fd.interval,
                pre: fd.prefix,
                platA: fd.platA,
                platB: fd.platB,
            };
            //msg = {msg: "GETTING KLINES..."};
            socket?.emit(ep, fd);
            /* const ret = await api().post('/cointest', fd)
        
        if (ret.data.err){
            msg = { msg: ret.data.err, err: true };
            return
        }
        console.log(ret.data); */
        } catch (e) {
            console.log(e);
        }
    };

    $effect(() => {
        sessionStorage.setItem(
            `${location.pathname}__formstate`,
            JSON.stringify(formState)
        );
        sessionStorage.setItem(
            `${location.pathname}__state`,
            JSON.stringify(_state)
        );
       
    });
    $effect(()=>{
        // Watch formstate
        // Update klinesPrefixB if linked
        const kPreA = formState.klinesPrefixA;
        untrack(()=>{
            if (_state.klinesPrefixLinked){
                formState.klinesPrefixB = kPreA
            }
        })
    })
</script>

<div>
    <TMeta title={`Cross CompareArbitrage Cointest - ${SITE}`} />
    <div class="w-100p h-100p relative md:p-5 p-2 flex flex-col">
        <div
            class="md:p-4 p-2 my-2 border-md border-card border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh"
        >
            <h2 class="font-bold fs-20">
                CROSS-COMPARE ARBIT RESULTS
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
                                subtitle: `[${_state.platA} - ${_state.platB}] ${
                                    _state.interval
                                }m: ${_state.pre ?? ""}`,
                            },
                        ]}
                    />
                {/if}
                {#if _state.show_details}
                    <div class="my-2 flex gap-10 justify-center">
                        <TuStats
                            stats={[
                                { title: "Trades", subtitle: res.trades ?? 0 },
                                {
                                    title: "Profit",
                                    subtitle: `${res.ccy ?? "USDT"} ${formatter
                                        .format(res.profit ?? 0)
                                        .replace("$", "")}`,
                                    hover: `${formatter
                                        .format((res.profit ?? 0) * 18)
                                        .replace("$", "R")}`,
                                    //hover: numToWords(Math.round(res.profit ?? 0)),
                                },
                                {
                                    title: "W",
                                    subtitle: `${res.w ?? 0}`,
                                },
                                {
                                    title: "L",
                                    subtitle: `${res.l ?? 0}`,
                                },
                            ]}
                        />
                    </div>
                {/if}
            </div>

            <div class="mt-4 oy-">
                {#if !_state.show_details}
                    <CointestTable rows={parseData(res)} />
                {:else}
                    <ArbitTable rows={res.orders} />
                {/if}
            </div>
        </div>
        <TuModalContainer bind:open={paramsAreaOpen}>
            <div class="">
                <div class="h-100p oy-hidden relative">
                    <div
                        class="flex justify-between items-center w-100p p-2 gap-2"
                    >
                        <span>{formState?.only ?? "All"}</span>
                        <UButton
                            onclick={() => (paramsAreaOpen = !paramsAreaOpen)}
                            class="ctrl-btn btn-primary mb-2"
                        >
                            <i class="fi fi-rr-angle-down"></i>
                        </UButton>
                    </div>

                    <div class="content">
                        <UDivider class="mb-7 mt-2" />
                        <UForm
                            id="form"
                            state={formState}
                            class="space-y-5 flex flex-col items-center"
                            onsubmit={handleSubmit}
                        >
                            <div
                                class="w-full grid grid-cols-2 gap-2 items-center"
                            >
                                <TuSelect
                                    placeholder="Platform A"
                                    options={selectPlatforms(platforms)}
                                    bind:value={formState.platA}
                                    required
                                />
                                <TuSelect
                                    placeholder="Platform B"
                                    options={selectPlatforms(platforms)}
                                    bind:value={formState.platB}
                                    required
                                />
                            </div>

                            <div class="grid sm:grid-cols-3 gap-2">
                                <UFormGroup>
                                    <UCheckbox
                                        color="primary"
                                        label="Offline"
                                        bind:value={formState.offline}
                                    />
                                </UFormGroup>
                                <UCheckbox
                                    color="primary"
                                    label="Save"
                                    variant="primary
                                "
                                    bind:value={formState.save}
                                />
                                <UCheckbox
                                    color="primary"
                                    label="Save klines"
                                    bind:value={formState.save_klines}
                                />
                            </div>
                            <div class="flex items-center gap-2">
                                <UCheckbox
                                    color="primary"
                                    label="Demo"
                                    variant="primary
                                "
                                    bind:value={formState.demo}
                                />
                                <UCheckbox
                                    color="primary"
                                    label="Skip Saved"
                                    bind:value={formState.skip_saved}
                                />
                                <UCheckbox
                                    color="primary"
                                    label="Show Details"
                                    bind:value={_state.show_details}
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
                                    label="Flipped"
                                    title="Buy at C, sell at A"
                                    bind:value={formState.flipped}
                                />
                                <UCheckbox
                                    color="primary"
                                    label="Fix invalid"
                                    bind:value={formState.fix_invalid}
                                />
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <TuSelect
                                    class="flex-1"
                                    searchable
                                    innerHint="Search strategy..."
                                    placeholder="Strategy"
                                    options={toSelectStrategies(strategies)}
                                    bind:value={formState.strNum}
                                    disabled={false}
                                />
                                <UCheckbox
                                    color="primary"
                                    label="Just show"
                                    bind:value={formState.show}
                                />
                            </div>
                            <div
                                class="grid grid-cols-2 items-center gap-4 w-full"
                            >
                                <UFormGroup label="Interval">
                                    <TuSelect
                                        placeholder="Interval"
                                        options={selectIntervals}
                                        bind:value={formState.interval}
                                        required
                                    />
                                </UFormGroup>
                                <UFormGroup label="Only">
                                    <TuSelect
                                        placeholder="Pair"
                                        options={[
                                            { label: "None", value: undefined },
                                            ...selectSymbols,
                                        ]}
                                        bind:value={formState.only}
                                        required
                                    />
                                </UFormGroup>
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
                                <UFormGroup label="Custom only"
                                    ><UInput
                                        placeholder="e.g SOL/USDT"
                                        bind:value={formState.cOnly}
                                        name="base"
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
                                <UFormGroup label="Min %"
                                    ><UInput
                                        placeholder="e.g ,3"
                                        bind:value={formState.perc}
                                        name="perc"
                                        type="number"
                                        step="any"
                                    ></UInput></UFormGroup
                                >
                            </div>
                            <div class="flex justify-between items-end gap-3">
                                <UFormGroup label="KlinesA prefix">
                                    <UInput
                                        name="k-prefix"
                                        bind:value={formState.klinesPrefixA}
                                        placeholder="KlinesA prefix..."
                                    />
                                </UFormGroup>
                                <button type="button"
                                    aria-label="Link klines prefix"
                                    class={"btn-sm btn btn-rounded btn-ghost rounded-lg " + (_state.klinesPrefixLinked ? 'text-white' : '')}
                                    onclick={() =>
                                        (_state.klinesPrefixLinked =
                                            !_state.klinesPrefixLinked)}
                                >
                                    <i class="fi fi-br-link"></i>
                                </button>
                                <UFormGroup label="KlinesB prefix">
                                    <UInput
                                    disabled={_state.klinesPrefixLinked}
                                        name="k-prefix"
                                        bind:value={formState.klinesPrefixB}
                                        placeholder="KlinesB prefix..."
                                    />
                                </UFormGroup>
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
