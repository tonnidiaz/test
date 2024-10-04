<template>
    <div>
        <TMeta :title="`Backtest - ${SITE}`" />
        <div class="w-100p h-100p relative md:p-5 p-2 flex flex-col">
            <div
                class="md:p-4 p-2 my-2 border-md border-card border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh"
            >
                <h2 class="font-bold fs-20">
                    RESULTS
                    <span
                        @click="
                            () => {
                                copy(true);
                            }
                        "
                        class="btn pointer rounded-full btn-md btn-ghost"
                        ><i class="fi fi-rr-copy"></i
                    ></span>
                </h2>

                <div class="flex flex-col">
                    <TuStats
                        :stats="[ 
                            {
                                title: 'Aside',
                                subtitle: `${res.ccy ?? ''} ${formatter
                                    .format(res.aside ?? 0)
                                    .replace('$', '')}`,
                                hover: `${formatter
                                    .format((res.aside ?? 0) * 18.5)
                                    .replace('$', 'R')}`,
                            },
                        ]"
                    />
                    <div class="my-2 flex gap-10 justify-center">
                        <TuStats
                            :stats="[
                                { title: 'Trades', subtitle: res.trades ?? 0 },
                                {
                                    title: 'Profit',
                                    subtitle: `${res.ccy ?? ''} ${formatter
                                        .format(res.profit ?? 0)
                                        .replace('$', '')}`,
                                    hover: `${formatter
                                        .format((res.profit ?? 0) * 18)
                                        .replace('$', 'R')}`,
                                    //hover: numToWords(Math.round(res.profit ?? 0)),
                                },
                                {
                                    title: 'W',
                                    subtitle: `${(res.gain ?? 0).toFixed(2)}%`,
                                },
                                {
                                    title: 'L',
                                    subtitle: `${(res.loss ?? 0).toFixed(2)}%`,
                                },
                            ]"
                        />
                    </div>
                </div>

                <div class="mt-4 oy-">
                    <BacktestTable v-if="true" :rows="parseData(res)" />
                </div>
            </div>
            <TuModalContainer v-model="paramsAreaOpen">
                <div>
                    <div class="h-100p oy-hidden relative">
                        <div
                            class="flex justify-between items-center w-100p p-2 gap-2"
                        >
                            <span>{{ formState?.symbol }}</span>
                            <UButton
                                @click="paramsAreaOpen = !paramsAreaOpen"
                                class="ctrl-btn btn-primary mb-2"
                            >
                                <i class="fi fi-rr-angle-down"></i>
                            </UButton>
                        </div>

                        <div class="content">
                            <UDivider class="mb-7 mt-2" />
                            <UForm
                                :state="formState"
                                class="space-y-5 flex flex-col items-center"
                                @submit="handleSubmit"
                                id="form"
                            >
                                <div
                                    class="w-full grid grid-cols-2 gap-4 items-center"
                                >
                                    <TuSelect
                                        placeholder="Platform"
                                        :options="selectPlatforms(platforms)"
                                        v-model="formState.platform"
                                        required
                                    />

                                    <div class="flex items-center gap-2">
                                        <UFormGroup>
                                            <UCheckbox
                                                color="primary"
                                                label="Offline"
                                                variant="primary
                                "
                                                v-model="formState.offline"
                                            />
                                        </UFormGroup>
                                        <UFormGroup>
                                            <UCheckbox
                                                color="primary"
                                                label="Use file"
                                                variant="primary
                                "
                                                v-model="formState.useFile"
                                            />
                                        </UFormGroup>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <UInput
                                        :required="formState.useFile"
                                        type="file"
                                        class="file-input file-input-bordered file-input-sm"
                                        override="class"
                                        @change="(e) => (formState.file = e[0])"
                                    />
                                </div>
                                <div
                                    class="flex items-center gap-3 justify-center"
                                >
                                    <UCheckbox
                                        color="primary"
                                        label="Parsed"
                                        variant="primary
                                "
                                        v-model="formState.isParsed"
                                    />
                                    <UCheckbox
                                        color="primary"
                                        label="Save"
                                        variant="primary
                                "
                                        v-model="formState.save"
                                    />

                                    <UCheckbox
                                        color="primary"
                                        label="Heikin-ashi"
                                        variant="primary
                                "
                                        v-model="formState.isHa"
                                    />
                                </div>
                                <div class="flex items-center gap-2">
                                    <UCheckbox
                                        color="primary"
                                        label="Demo"
                                        variant="primary
                                "
                                        v-model="formState.demo"
                                    />
                                    <UCheckbox
                                        color="primary"
                                        label="Skip Existing"
                                        variant="primary
                                "
                                        v-model="formState.skip_existing"
                                    />
                                    <UCheckbox
                                        color="primary"
                                        label="Use invalid"
                                        variant="primary
                                "
                                        v-model="formState.useInvalid"
                                    />
                                </div>
                                <div
                                    class="grid grid-cols-2 items-center gap-4 w-full"
                                >
                                    <div class="flex items-center gap-1">
                                        <TuSelect
                                            class="flex-1"
                                            searchable
                                            innerHint="Search strategy..."
                                            placeholder="Strategy"
                                            :options="
                                                toSelectStrategies(strategies)
                                            "
                                            v-model="formState.strategy"
                                            required
                                            :click="() => console.log('click')"
                                            :pointer-down="
                                                () => console.log('click')
                                            "
                                        />
                                        <div
                                            class="flex flex-col gap- items-center"
                                        >
                                            <UButton
                                                @click="
                                                    socket?.emit('strategies')
                                                "
                                                class="btn-xs btn-sm btn-ghost rounded-full"
                                                variant="ghost"
                                            >
                                                <span
                                                    ><i
                                                        class="fi fi-rr-refresh"
                                                    ></i
                                                ></span>
                                            </UButton>
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
                                                    ></i
                                                ></span>
                                            </a>
                                        </div>
                                    </div>

                                    <TuSelect
                                        placeholder="Interval"
                                        :options="selectIntervals"
                                        v-model="formState.interval"
                                        required
                                    />
                                </div>
                                <div
                                    class="flex items-end justify-center gap-4"
                                >
                                    <UFormGroup label="Start balance">
                                        <UInput
                                            type="text"
                                            placeholder="Enter start balance..."
                                            required
                                            v-model="formState.bal"
                                        />
                                    </UFormGroup>
                                    <div class="flex gap-4">
                                        <UFormGroup label="Margin"
                                            ><TuSelect
                                                placeholder="Margin"
                                                :options="margins"
                                                v-model="formState.lev"
                                            ></TuSelect
                                        ></UFormGroup>
                                        <UFormGroup label="Pair"
                                            ><TuSelect
                                                placeholder="Pair"
                                                :options="selectSymbols"
                                                v-model="formState.symbol"
                                                searchable
                                                innerHint="Search pair..."
                                            ></TuSelect
                                        ></UFormGroup>
                                    </div>
                                </div>
                                <div class="flex gap-4 items-end">
                                    <TuSelect
                                        placeholder="Parent"
                                        :options="selectParents(parents)"
                                        v-model="formState.parent"
                                        required
                                    />
                                    <UFormGroup label="Custom Pair"
                                        ><UInput
                                            placeholder="e.g SOL/USDT"
                                            v-model="formState.csymbol"
                                            name="pair"
                                        ></UInput
                                    ></UFormGroup>
                                </div>

                                <div class="flex justify-center">
                                    <UFormGroup>
                                        <TuDatePicker
                                            v-model="formState.date"
                                        />
                                    </UFormGroup>
                                </div>
                                <div
                                    v-if="msg.msg"
                                    class="my-2 text-center p-2 bg-base-200 fs-14 border-card -1 br-5 w-full wp-wrap"
                                >
                                    <span>{{ msg.msg }}</span>
                                </div>
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
</template>

<script setup lang="ts">
import UDivider from "@/components/UDivider.vue";
import { useAppStore } from "@/src/stores/app";
import {
    selectIntervals,
    selectParents,
    selectPlatforms,
    selectSymbols,
    socket,
    SITE
} from "@/utils/constants";
import { formatter, parseDate, toSelectStrategies } from "@/utils/funcs";
import { type IObj } from "@cmn/utils/interfaces";
import { storeToRefs } from "pinia";
const appStore = useAppStore();
const initRes = { data: {} };

const res = ref<IObj>(initRes);
const { setStrategies } = appStore;
const { strategies, platforms, parents } = storeToRefs(appStore);

const _state = ref({
    parent: "",
    interval: 0,
});
const msg = ref<IObj>({}),
    paramsAreaOpen = ref(true),
    clId = ref("");

const margins = [1, 2, 3, 4, 5].map((e) => ({ label: `x${e}`, value: e }));

const formState = ref<IObj>({
    strategy: 8,
    interval: 60,
    bal: 50,
    offline: true,
    lev: 1,
    save: true,
    skip_existing: true,
    useFile: false,
    platform: "binance",
    parent: "cloud5",
    demo: false,
    symbol: ["SOL", "USDT"].toString(),

    date: {
        start: "2024-01-01 00:00:00",
        end: "2024-10-28 23:59:00",
    },
});

const summary = ref("");

const getData = (ts: string) => res.value.data[ts];
const parseData = (data: IObj) => {
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
        navigator.clipboard.writeText(summary.value);
        const msg = "COPIED TO CLIPBORAD";
        if (_alert) {
            alert(msg);
        }

        console.log(msg);
    } catch (e) {
        console.log(e);
    }
};

const onBacktest = (data: any) => {
    console.log("ON BACKTEST");

    if (data.data && data.clId == clId.value) {
        const _data = data.data;
        res.value = _data;
        console.log(_data);
        const profit = formatter.format(_data.profit ?? 0);
        const aside = formatter.format(_data.aside ?? 0);

        const pair = `${_data.base}-${_data.ccy}`;
        const txt = `${_state.value.interval}m_[${_state.value.parent}] [${
            _data.trades
        }] [${pair}] [${_data.str_name}]: ${aside.replace(
            "$",
            ""
        )} | ${profit.replace("$", "")}`;
        summary.value = txt;
        copy();
        msg.value = {};
    } else if (!data.data) {
        if (data.err) {
            msg.value = { msg: data.err, err: true };
        } else {
            res.value = initRes;
            console.log(data);
            msg.value = { msg: data };
        }
    }
};

onMounted(() => {
    console.log("MOUNTED");
    socket?.on("backtest", onBacktest);
    socket?.on("disconnect", (r, d) => {
        console.log("IO DISCONNECTED");
        msg.value = { msg: "IO DISCONNECTED" };
    });
    socket?.on("connect", () => {
        console.log("IO CONNECTED");
        msg.value = { msg: "IO CONNECTED" };
    });
});

const handleSubmit = async (e: any) => {
    try {
        clId.value = `${Date.now()}`;
        const { csymbol } = formState.value;
        let fd: IObj = {
            ...formState.value,
            strategy: formState.value.strategy,
            lev: formState.value.lev,
            symbol:
                csymbol && csymbol.length
                    ? csymbol.split("/")
                    : formState.value.symbol.split(","),
            interval: formState.value.interval,
            clId: clId.value,
            ...formState.value.date,
        };
        delete fd["date"];
        fd = { ...fd, start: parseDate(fd.start), end: parseDate(fd.end) };
        console.log(fd);
        _state.value = {
            ..._state.value,
            parent: fd.parent.toUpperCase(),
            interval: fd.interval,
        };
        //msg.value = {msg: "GETTING KLINES..."};
        socket?.emit("backtest", fd);
        /* const ret = await api().post('/backtest', fd)
        
        if (ret.data.err){
            msg.value = { msg: ret.data.err, err: true };
            return
        }
        console.log(ret.data); */
    } catch (e) {
        console.log(e);
    }
};

onMounted(() => {
    socket?.on("strategies", ({ data, err }) => {
        if (err) {
            console.log(err);
            return;
        }
        setStrategies(data);
        console.log("GOT THE STRATEGIES");
    });
});

watch(formState, state=>{
    sessionStorage.setItem(`${location.pathname}__state`, JSON.stringify(state))
}, {deep: true, immediate: false})

onMounted(()=>{
    //Check for saved state
    const state = sessionStorage.getItem(`${location.pathname}__state`)
    if (state){
        formState.value = JSON.parse(state)
    }
})
</script>

<style lang="scss">
.params-area {
    max-width: 50vw;
}

@media screen and (max-width: 960px) {
    .params-area {
        max-width: 60vw;
    }
}
@media screen and (max-width: 640px) {
    .params-area {
        max-width: calc(100vw - 20px);
    }
}
</style>
