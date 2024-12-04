    <div>
        <TMeta title={`Arbitrage Coin test - ${SITE}`} />
        <div class="w-100p h-100p relative md:p-5 p-2 flex flex-col">
            <div
                class="md:p-4 p-2 my-2 border-md border-card border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh"
            >
                <h2 class="font-bold fs-20">
                    ARBITRAGE-TEST RESULTS
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <span
                        onclick=
                            {() => {
                                copy(true);
                            }}
                        
                        class="btn pointer rounded-full btn-md btn-ghost"
                        ><i class="fi fi-rr-copy"></i
                    ></span>
                </h2>

                <div class="flex flex-col">
                    {#if _state.interval}
                        <TuStats
                        class="justify-start items-start"
                        stats={[
                            {
                                title: 'Summary',
                                subtitle: `[${_state.plat}] ${
                                    _state.interval
                                }m: [${_state.type}] ${_state.pre ?? ''}_ [${
                                    _state.B
                                }]`,
                            },
                        ]}
                    />
                    {/if}
                    {#if _state.show_details}
                       <div
                        class="my-2 flex gap-10 justify-center"
                    >
                        <TuStats
                        stats={[
                            { title: 'Trades', subtitle: res.trades ?? 0 },
                            {
                                title: 'Profit',
                                subtitle: `${res.ccy ?? 'USDT'} ${formatter
                                    .format(res.profit ?? 0)
                                    .replace('$', '')}`,
                                hover: `${formatter
                                    .format((res.profit ?? 0) * 18)
                                    .replace('$', 'R')}`,
                                //hover: numToWords(Math.round(res.profit ?? 0)),
                            },
                            {
                                title: 'W',
                                subtitle: `${res.w ?? 0}`,
                            },
                            {
                                title: 'L',
                                subtitle: `${res.l ?? 0}`,
                            },
                        ]}
                        />
                    </div>  
                    {/if}
                   
                </div>

                <div class="mt-4 oy-">
                    {#if !_state.show_details}
                    <CointestTable
                        rows={parseData(res)}
                    />
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
                            <span>{ formState?.only }</span>
                            <UButton
                                onclick={()=>paramsAreaOpen = !paramsAreaOpen}
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
                                        placeholder="Platform"
                                        options={selectPlatforms(platforms)}
                                        bind:value={formState.plat}
                                        required
                                    />

                                    <UFormGroup>
                                        <UCheckbox
                                            label="Offline"
                                            bind:value={formState.offline}
                                        />
                                    </UFormGroup>
                                </div>

                                <div class="grid sm:grid-cols-2 gap-2">
                                    <UCheckbox
                                        label="Save"
                                        bind:value={formState.save}
                                    />
                                    <UCheckbox
                                        label="Save klines"
                                        bind:value={formState.save_klines}
                                    />
                                </div>
                                <div class="flex items-center gap-2">
                                    <UCheckbox
                                        label="Demo"
                                        bind:value={formState.demo}
                                    />
                                    <UCheckbox
                                        label="Skip Saved"
                                        bind:value={formState.skip_saved}
                                    />
                                    <UCheckbox
                                        label="Show Details"
                                        bind:value={_state.show_details}
                                    />
                                </div>
                                <div class="flex items-center gap-2">
                                    <UCheckbox
                                        label="Join"
                                        bind:value={formState.from_last}
                                    />
                                    <UCheckbox
                                        label="Flipped"
                                        title="Buy at C, sell at A"
                                        bind:value={formState.flipped}
                                    />
                                    <UCheckbox
                                        label="Fix invalid"
                                        bind:value={formState.fix_invalid}
                                    />
                                    <UCheckbox
                                        label="Just show"
                                        bind:value={formState.show}
                                    />
                                </div>
                                <div
                                    class="grid sm:grid-cols-3 items-center gap-4 w-full"
                                >
                                    <div
                                        class="flex items-center gap-1 justify-center"
                                    >
                                        <TuSelect
                                            class="flex-1"
                                            searchable
                                            innerHint="Search..."
                                            placeholder="Type"
                                            options=
                                                {types.map((el) => ({
                                                    label: el.toUpperCase(),
                                                    value: el,
                                                }))}
                                            bind:value={formState.type}
                                            required
                                        />
                                    </div>

                                    <TuSelect
                                        placeholder="Interval"
                                        options={selectIntervals}
                                        bind:value={formState.interval}
                                        required
                                    />
                                    <TuSelect
                                        placeholder="Base"
                                        options={
                                            bases.sort().map((el) => ({
                                                label: el.toUpperCase(),
                                                value: el,
                                            }))
                                        }
                                        bind:value={formState.B}
                                        required
                                    />
                                </div>
                                <div
                                    class="flex items-end justify-center gap-4"
                                >
                                    <UFormGroup label="Custom base"
                                        ><UInput
                                            placeholder="e.g ETH"
                                            bind:value={formState.cB}
                                            name="base"
                                        ></UInput
                                    ></UFormGroup>
                                    <UFormGroup label="Start balance">
                                        <UInput
                                            type="text"
                                            placeholder="Enter start balance..."
                                            required
                                            bind:value={formState.bal}
                                        />
                                    </UFormGroup>
                                    <UFormGroup
                                        label="C"
                                        title="WILL ONLY DO THIS ONE PAIR"
                                        ><UInput
                                            placeholder="e.g APEX"
                                            bind:value={formState.only}
                                            name="C"
                                            required={_state.show_details}
                                        ></UInput
                                    ></UFormGroup>
                                </div>
                                <div
                                    class="flex items-end justify-center gap-4"
                                >
                                    <UFormGroup label="Prefix"
                                        ><UInput
                                            placeholder="e.g def"
                                            bind:value={formState.prefix}
                                            name="prefix"
                                        ></UInput
                                    ></UFormGroup>
                                    <UFormGroup label="Min %"
                                        ><UInput
                                            placeholder="e.g ,3"
                                            bind:value={formState.perc}
                                            name="perc"
                                            type="number"
                                            step="any"
                                        ></UInput
                                    ></UFormGroup>
                                    <UFormGroup label="A"
                                        ><UInput
                                            placeholder="e.g USDT"
                                            bind:value={formState.A}
                                            name="A"
                                        ></UInput
                                    ></UFormGroup>
                                </div>

                                <div class="flex justify-center">
                                    <UFormGroup>
                                        <TuDatePicker
                                            bind:value={formState.date}
                                        />
                                    </UFormGroup>
                                </div>
                                {#if msg.msg}
                                    <div
                                    class="my-2 text-center p-2 bg-base-200 fs-14 border-card -1 br-5 w-full wp-wrap"
                                >
                                    <span>{ msg.msg }</span>
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

<script lang="ts">
    import ArbitTable from "@/components/ArbitTable.svelte";
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
    import { socket, SITE, selectPlatforms, selectIntervals } from "@/lib/constants";
    import { formatter } from "@/lib/funcs";
    import { appStore } from "@/stores/app.svelte";
    import { parseDate } from "@cmn/utils/functions";
    import type { IObj } from "@cmn/utils/interfaces";
    import { onMount } from "svelte";



const types = ["tri", "cross"],
    bases = [
        "AUD",
        "AED",
        "HKD",
        "BRL",
        "EUR",
        "TRY",
        "USDC",
        "BTC",
        "ETH",
        "OKB",
        "DAI",
        "BRZ",
        "USDE",
        "BNB",
        "TUSD",
        "XRP",
        "TRX",
        "ZAR",
        "IDRT",
        "UAH",
        "DOGE",
        "PLN",
        "RON",
        "ARS",
        "FDUSD",
        "AEUR",
        "JPY",
        "MXN",
        "CZK",
        "COP",
    ];

const initRes = { data: {} };
let res = $state<IObj>(initRes);
let { strategies, platforms, parents } = $derived(appStore);
let msg = $state<IObj>({}),
    paramsAreaOpen = $state(true),
    clId = $state("");

const margins = [1, 2, 3, 4, 5].map((e) => ({ label: `x${e}`, value: e }));

let formState = $state<IObj>({
    type: types[0],
    interval: 60,
    bal: 50,
    offline: true,
    prefix: undefined,
    B: "BTC",
    A: "USDT",
    save: true,
    skip_existing: false,
    skip_saved: false,
    fix_invalid: false, 
    useFile: false,
    plat: "binance",
    demo: false,
    show: false,
    from_last: false,
    symbol: ["SOL", "USDT"].toString(),
    save_klines: true,
    date: {
        start: "2024-01-01 00:00:00",
        end: "2024-10-28 23:59:00",
    },
});

const defState = {
    interval: 0,
    plat: "",
    type: "",
    pre: "",
    show_details: false,
    B: "",
};
let summary = $state(""),
    _state = $state(defState);

const ep = "arbit-cointest";
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

    if (data.data && data.clId == clId) {
        const _data = data.data;
        res = {
            data: _data,
            plat: data.plat,
            orders: data.orders,
            trades: data.orders?.length,
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
    const state = sessionStorage.getItem(`${location.pathname}__state`)
    if (state){
        formState = JSON.parse(state)
    }
    socket?.on(ep, onCointest);
    socket?.on("disconnect", (r, d) => {
        console.log("IO DISCONNECTED");
        msg = { msg: "IO DISCONNECTED" };
    });
    socket?.on("connect", () => {
        console.log("IO CONNECTED");
        msg = { msg: "IO CONNECTED" };
    });
});
$effect(()=>{
    sessionStorage.setItem(`${location.pathname}__state`, JSON.stringify(formState))
})
const handleSubmit = async (e: any) => {
    try {
        console.log({only: formState.only})
        clId = `${Date.now()}`;
        const { csymbol } = formState;
        let fd: IObj = {
            ...formState,
            strategy: formState.strategy,
            lev: formState.lev,
            B: formState.cB ? formState.cB.toUpperCase() : formState.B,
            clId: clId,
            ...formState.date,
        };
        delete fd["date"];
        fd = { ...fd, start: parseDate(fd.start), end: parseDate(fd.end) };
        console.log(fd);
        _state = {
            ..._state,
            plat: fd.plat,
            interval: fd.interval,
            pre: fd.prefix,
            type: fd.type.toUpperCase(),
            B: fd.B,
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
</script>
