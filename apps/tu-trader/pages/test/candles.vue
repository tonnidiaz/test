<template>
    <div>
        <TMeta :title="`Candle test - ${SITE}`" />
        <div class="w-100p h-100p relative md:p-5 p-2 flex flex-col">
            <div
                class="md:p-4 p-2 my-2 border-md border-card border-1 br-10 flex-1 overflow-y-scroll max-h-80vh"
            >
                <div class="flex items-center gap-3 mb-3">
                    <TuSelect
                        class="w-150px"
                        placeholder="Display type"
                        :options="
                            ['chart', 'table'].map((el) => ({
                                label: el.toUpperCase(),
                                value: el,
                            }))
                        "
                        v-model="displayType"
                    />
                    <TuSelect
                        class="w-150px"
                        placeholder="Candle type"
                        :options="
                            ['ha', 'std'].map((el) => ({
                                label: el.toUpperCase(),
                                value: el,
                            }))
                        "
                        v-model="candleType"
                    />
                </div>

                <h2 v-if="displayType == 'table'" class="font-bold fs-20">RESULTS</h2>

                <div class="mt-4 overflow-y-scroll">
                    <CandletestTable
                        v-if="displayType == 'table'"
                        :rows="parseData(res.data)"
                    />
                    <TuChart
                        v-else
                        :interval="res.interval"
                        :symbol="res.symbol"
                        :df="res.data" :cType="candleType"
                    />
                </div>
            </div>
            <TuModalContainer v-model="paramsAreaOpen">
                 <div
            >
                <div class="flex justify-between items-center w-100p p-2 gap-2">
                    <span>{{ formState?.symbol }}</span>
                    <UButton
                        @click="paramsAreaOpen = !paramsAreaOpen"
                        class="ctrl-btn btn btn-primary mb-2"
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
                        <div class="w-full grid grid-cols-2 gap-4 items-center">
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
                            <div class="flex items-center gap-2">
                                <UFormGroup>
                                    <UCheckbox
                                        color="primary"
                                        label="Save"
                                        variant="primary
                                "
                                        v-model="formState.save"
                                    />
                                </UFormGroup>
                                <UFormGroup>
                                    <UCheckbox
                                        color="primary"
                                        label="Demo"
                                        variant="primary
                                "
                                        v-model="formState.demo"
                                    />
                                </UFormGroup>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <UInput
                                :required="formState.useFile"
                                size="sm"
                                type="file"
                                class="file-input file-input-bordered file-input-sm"
                                override="class"
                                @change="(e) => (formState.file = e[0])"
                            />
                        </div>

                        <div class="grid grid-cols-2 items-center gap-4 w-full">
                            <UFormGroup label="Pair"
                                ><TuSelect
                                    placeholder="Pair"
                                    :options="selectSymbols"
                                    v-model="formState.symbol"
                                    searchable
                                    innerHint="Search pair..."
                                ></TuSelect
                            ></UFormGroup>
                            <UFormGroup label="Interval">
                                <TuSelect
                                    placeholder="Interval"
                                    :options="intervals"
                                    v-model="formState.interval"
                                    required
                                />
                            </UFormGroup>
                        </div>

                        <div class="flex justify-center">
                            <UFormGroup>
                                <TuDatePicker v-model="formState.date" />
                            </UFormGroup>
                        </div>
                        <div
                            v-if="msg.msg"
                            class="my-2 text-center p-2 bg-base-300 border-card -1 br-5 w-full"
                        >
                            <span>{{ msg.msg }}</span>
                        </div>
                    </UForm>
                </div>
                <div class="p-3">
                            <UButton form="form" type="submit" class="w-full btn-primary">
                            Start
                        </UButton> 
                        </div>
            </div>
            </TuModalContainer>
           
        </div>
    </div>
</template>

<script setup lang="ts">
import { parseDate } from "@repo/common/src/utils/funcs2";
import { type IObj } from "@repo/common/src/utils/interfaces";
import { storeToRefs } from "pinia";
import TuDatePicker from "~/components/TuDatePicker.vue";
import TuSelect from "~/components/TuSelect.vue";
import { useAppStore } from "@/src/stores/app";
import { selectPlatforms, socket, SITE } from "~/utils/constants";
import { formatter } from "~/utils/funcs";
import { ref, reactive, onMounted } from "vue";

const appStore = useAppStore();
const initRes = { data: [] };
const res = ref<IObj>(initRes);
const { setStrategies } = appStore;
const { strategies, platforms } = storeToRefs(appStore);
const msg = ref<IObj>({}),
    paramsAreaOpen = ref(true);
const displayType = ref<"chart" | "table">("table");
const candleType = ref<"ha" | "std">("ha");

const intervals = [1, 5, 15, 30, 60, 120].map((e) => ({ label: `${e}m`, value: e }));
const margins = [1, 2, 3, 4, 5].map((e) => ({ label: `x${e}`, value: e }));

const formState = reactive<IObj>({
    interval: 60,
    offline: true,
    demo: false,
    save: true,
    platform: "binance",
    symbol: ["SOL", "USDT"].toString(),
    date: {
        start: "2024-01-01 00:00:00",
        end: "2024-10-28 23:59:00",
    },
});

const getData = (ts: string) => res.value.data[ts];

const parseData = (data: any[]) => {
    /* data =
        data.length < 500
            ? data
            : [
                  ...data.slice(0, 500),
                  ...data.slice(data.length - 50, data.length),
              ]; */
    return data;
};


const onBacktest = (data: any) => {
    console.log("ON BACKTEST");
    if (data.data) {
        res.value = data;
        msg.value = {};
    } else if (data.err) {
        msg.value = { msg: data.err, err: true };
    } else {
        console.log(data);
        msg.value = { msg: data };
    }
};
onMounted(() => {
    socket?.on("test-candles", onBacktest);
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
        let fd: IObj = {
            ...formState,
            symbol: formState.symbol.split(","),
            interval: formState.interval,
            ...formState.date,
        };
        delete fd["date"];
        fd = { ...fd, start: parseDate(fd.start), end: parseDate(fd.end) };
        console.log(fd);
        res.value = initRes;
        socket?.emit("test-candles", fd);
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
</script>
