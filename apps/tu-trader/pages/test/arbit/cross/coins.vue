<template>
    <div>
        <TMeta :title="`CrossArbitrage Cointest - ${SITE}`" />
        <div class="w-100p h-100p relative md:p-5 p-2 flex flex-col">
            <div
                class="md:p-4 p-2 my-2 border-md border-card border-1 br-10 flex-1 oy-scroll ox-scroll flex flex-col max-h-80vh"
            >
                <h2 class="font-bold fs-20">
                    CROSS-ARBIT-TEST RESULTS
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
                        v-if="_state.interval"
                        class="justify-start items-start"
                        :stats="[
                            {
                                title: 'Summary',
                                subtitle: `[${_state.platA} - ${_state.platB}] ${
                                    _state.interval
                                }m: ${_state.pre ?? ''}`,
                            },
                        ]"
                    />
                    <div
                        class="my-2 flex gap-10 justify-center"
                        v-if="_state.show_details"
                    >
                        <TuStats
                            :stats="[
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
                            ]"
                        />
                    </div>
                </div>

                <div class="mt-4 oy-">
                    <CointestTable
                        v-if="!_state.show_details"
                        :rows="parseData(res)"
                    />
                    <ArbitTable v-else :rows="res.orders" />
                </div>
            </div>
            <TuModalContainer v-model="paramsAreaOpen">
                <div class="">
                    <div class="h-100p oy-hidden relative">
                        <div
                            class="flex justify-between items-center w-100p p-2 gap-2"
                        >
                            <span>{{ formState?.only ?? 'All' }}</span>
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
                                id="form"
                                :state="formState"
                                class="space-y-5 flex flex-col items-center"
                                @submit="handleSubmit"
                            >
                                <div
                                    class="w-full grid grid-cols-2 gap-2 items-center"
                                >
                                    <TuSelect
                                        placeholder="Platform A"
                                        :options="selectPlatforms(platforms)"
                                        v-model="formState.platA"
                                        required
                                    />
                                    <TuSelect
                                        placeholder="Platform B"
                                        :options="selectPlatforms(platforms)"
                                        v-model="formState.platB"
                                        required
                                    />
                                </div>

                                <div class="grid sm:grid-cols-3 gap-2">
                                    <UFormGroup>
                                        <UCheckbox
                                            color="primary"
                                            label="Offline"
                                            variant="primary
                                "
                                            v-model="formState.offline"
                                        />
                                    </UFormGroup>
                                    <UCheckbox
                                        color="primary"
                                        label="Save"
                                        variant="primary
                                "
                                        v-model="formState.save"
                                    />
                                    <UCheckbox
                                        color="primary"
                                        label="Save klines"
                                        variant="primary
                                "
                                        v-model="formState.save_klines"
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
                                        label="Skip Saved"
                                        variant="primary
                                "
                                        v-model="formState.skip_saved"
                                    />
                                    <UCheckbox
                                        color="primary"
                                        label="Show Details"
                                        variant="primary
                                "
                                        v-model="_state.show_details"
                                    />
                                </div>
                                <div class="flex items-center gap-2">
                                    <UCheckbox
                                        color="primary"
                                        label="Join"
                                        variant="primary
                                "
                                        v-model="formState.from_last"
                                    />
                                    <UCheckbox
                                        color="primary"
                                        label="Flipped"
                                        variant="primary
                                "
                                        title="Buy at C, sell at A"
                                        v-model="formState.flipped"
                                    />
                                    <UCheckbox
                                        color="primary"
                                        label="Fix invalid"
                                        variant="primary
                                "
                                        v-model="formState.fix_invalid"
                                    />
                                   
                                </div>
                                <div class="grid grid-cols-2 gap-3"> <TuSelect
                                            class="flex-1"
                                            searchable
                                            innerHint="Search strategy..."
                                            placeholder="Strategy"
                                            :options="
                                                toSelectStrategies(strategies)
                                            "
                                            v-model="formState.strNum"
                                            required
                                            :click="() => console.log('click')"
                                            :pointer-down="
                                                () => console.log('click')
                                            "
                                        />
                                    <UCheckbox
                                        color="primary"
                                        label="Just show"
                                        variant="primary
                                "
                                        v-model="formState.show"
                                    /></div>
                                <div
                                    class="grid grid-cols-2 items-center gap-4 w-full"
                                >
                                    <UFormGroup label="Interval">
                                        <TuSelect
                                            placeholder="Interval"
                                            :options="selectIntervals"
                                            v-model="formState.interval"
                                            required
                                        />
                                    </UFormGroup>
                                    <UFormGroup label="Only">
                                        <TuSelect
                                            placeholder="Pair"
                                            :options="[{label: 'None', value: undefined}, ...selectSymbols]"
                                            v-model="formState.only"
                                            required
                                        />
                                    </UFormGroup>

                                   
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
                                     <UFormGroup label="Custom only"
                                        ><UInput
                                            placeholder="e.g SOL/USDT"
                                            v-model="formState.cOnly"
                                            name="base"
                                        ></UInput
                                    ></UFormGroup>
                                </div>
                                <div
                                    class="flex items-end justify-center gap-4"
                                >
                                    <UFormGroup label="Prefix"
                                        ><UInput
                                            placeholder="e.g def"
                                            v-model="formState.prefix"
                                            name="prefix"
                                        ></UInput
                                    ></UFormGroup>
                                    <UFormGroup label="Min %"
                                        ><UInput
                                            placeholder="e.g ,3"
                                            v-model="formState.perc"
                                            name="perc"
                                            type="number"
                                            step="any"
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

import UDivider from "~/components/UI/UDivider.vue";
import { useAppStore } from "@/src/stores/app";
import {
    selectIntervals,
    selectPlatforms,
    selectSymbols,
    socket, SITE
} from "~/utils/constants";
import { formatter, numToWords, parseDate } from "~/utils/funcs";
import { ref, reactive, onMounted, watch } from "vue";
import { toSelectStrategies } from "~/utils/funcs";
import {storeToRefs} from 'pinia'
import { type IObj } from "@repo/common/src/utils/interfaces";


const appStore = useAppStore();
const initRes = { data: {} };
const res = ref<IObj>(initRes);
const { setStrategies } = appStore;
const { strategies, platforms, parents } = storeToRefs(appStore);
const msg = ref<IObj>({}),
    paramsAreaOpen = ref(true),
    clId = ref("");

const margins = [1, 2, 3, 4, 5].map((e) => ({ label: `x${e}`, value: e }));

const formState = ref<{[key: string]: any | undefined}>({
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
    date: {
        start: "2024-01-01 00:00:00",
        end: "2024-10-28 23:59:00",
    },
});

const defState = {
    interval: 0,
    platA: "",
    platB: "",
    pre: "",
    show_details: false,
};
const summary = ref(""),
    _state = ref(defState);

const ep = "cross-arbit-cointest";
const getData = (ts: string) => res.value.data[ts];
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

const onCointest = (data: any) => {
    console.log("ON DATA");
    console.log({clId: clId.value})
    console.log(data)

    if (data.data && data.clId == clId.value) {
        const _data = data.data;
        res.value = {
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
        // summary.value = txt;
        // copy();
        console.log(data);
        msg.value = {};
    } else if (!data.data) {
        if (data.err) {
            msg.value = { msg: data.err, err: true };
        } else if (typeof data == "string") {
            res.value = initRes;
            msg.value = { msg: data };
        }
    }
};

onMounted(() => {
    socket?.on(ep, onCointest);
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
        let fd: IObj = {
            ...formState.value,
            only: formState.value.cOnly ? formState.value.cOnly.split('/') : formState.value.only ? formState.value.only.split(','): undefined,
            clId: clId.value,
            ...formState.value.date,
        };
        delete fd["date"];
        fd = { ...fd, start: parseDate(fd.start), end: parseDate(fd.end) };
        console.log(fd);
        _state.value = {
            ..._state.value,
            interval: fd.interval,
            pre: fd.prefix,
            platA: fd.platA,
            platB: fd.platB,
        };
        //msg.value = {msg: "GETTING KLINES..."};
        socket?.emit(ep, fd);
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
