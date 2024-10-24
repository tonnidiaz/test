<template>
    <tu-modal v-model="modalOpen">
        <template #toggler>
            <slot name="toggler" />
        </template>
        <template #content>
            <tu-card>
                <template #header>
                    <h3>{{ mode }} bot</h3>
                </template>
                <UForm
                    class="flex flex-col gap-2"
                    @submit="handleSubmit"
                    :state="formState"
                >
                    <div class="grid sm:grid-cols-2 gap-3 items-end">
                        <UFormGroup label="Bot name">
                            <UInput
                                v-model="formState.name"
                                required
                                placeholder="Enter bot name..."
                            />
                        </UFormGroup>
                        <UFormGroup>
                            <TuSelect
                                v-model="formState.type"
                                class="w-full"
                                searchable
                                innerHint="Search..."
                                placeholder="Bot type"
                                :disabled="
                                    mode == 'Edit' && formState.orders?.length
                                "
                                required
                                :options="listToOpt(botTypes)"
                            />
                        </UFormGroup>
                    </div>
                    <UAccordion
                        class="my-1"
                        v-if="formState.type == 'arbitrage'"
                    >
                        <template #label>Arbitrage settings</template>
                        <template #content>
                            <div
                                class="grid sm:grid-cols-2 gap-3 items-end mt-4 mb-1"
                            >
                                <UFormGroup label="Arbit type">
                                    <TuSelect
                                        v-model="formState.arbit_settings._type"
                                        class="w-full"
                                        searchable
                                        :disabled="
                                            formState.type == 'normal' ||
                                            (mode == 'Edit' &&
                                                formState.orders?.length)
                                        "
                                        innerHint="Search..."
                                        placeholder="Arbitrage type"
                                        required
                                        :options="listToOpt(arbitTypes)"
                                    />
                                </UFormGroup>
                                <UFormGroup label="Min. arbit %">
                                    <UInput
                                        :disabled="formState.type == 'normal'"
                                        required
                                        v-model="
                                            formState.arbit_settings.min_perc
                                        "
                                        placeholder="e.g .3"
                                        type="number"
                                        step="any"
                                    />
                                </UFormGroup>
                            </div>
                            <div class="my-2 grid grid-cols-2 items-center">
                                <UCheckbox
                                    label="MEGA BOT"
                                    title="A BOT WITH ARBITRAGE CHILDREN"
                                    v-model="formState.arbit_settings.mega"
                                ></UCheckbox>
                                <UCheckbox
                                    label="Use Ws"
                                    title="Use websockets"
                                    v-model="formState.arbit_settings.use_ws"
                                ></UCheckbox>
                            </div>
                            <TriArbitForm
                                v-if="!formState.arbit_settings.mega"
                                v-model="formState"
                            />
                            <UAccordion v-else>
                                <template #label>Child bots</template>
                                <template #content>
                                    <div class="my-3" v-for="(pair, i) of formState.child_pairs">
                                        <div class="flex w-full items-center gap-3 justify-between" >
                                            <h5>Bot #{{ i + 1 }}</h5>
                                        <UButton @click="()=>{
                                            formState.child_pairs = formState.child_pairs.filter((el, j)=> j != i)
                                            formState.child_pairsCnt += 1}" class="btn-sm w-34px h-30px rounded-lg btn-neutral">
                                            <i class="fi fi-br-trash fs-12"></i>
                                        </UButton>
                                    </div>
                                        
                                        <TriArbitForm v-model="formState.child_pairs[i]"/>
                                        <UDivider class="my-4"/>
                                    </div>
                                    <div>
                                       <div class="flex" style="justify-content: flex-end">
                                        <UButton @click="()=>{
                                            formState.child_pairs.push({}),
                                            formState.child_pairsCnt += 1}" class="w-full btn-sm h-30px rounded-lg btn-neutral">
                                            <i class="fi fi-br-plus fs-12"></i>
                                        </UButton>
                                    </div> 
                                    </div>
                                    
                                    
                                </template>
                            </UAccordion>
                        </template>
                    </UAccordion> 

                    <div
                        class="grid grid-cols-2 items-center justify-between gap-3 my-1"
                    >
                        <UFormGroup label="Start amount">
                            <UInput
                                required
                                v-model="formState.start_amt"
                                placeholder="Enter start amount..."
                                type="number"
                                step="any"
                            />
                        </UFormGroup>
                        <UFormGroup v-if="mode == 'Edit'" label="Balance">
                            <UInput
                                required
                                v-model="formState.balance"
                                placeholder="Enter balance..."
                                type="number"
                                step="any"
                                title="Increase/decrease the funds you're willing to trade with"
                            />
                        </UFormGroup>
                        <UFormGroup label="Platform">
                            <TuSelect
                                required
                                :options="
                                    platforms.map((el) => ({
                                        label: el.toUpperCase(),
                                        value: el.toLocaleLowerCase(),
                                    }))
                                "
                                placeholder="Platform"
                                v-model="formState.platform"
                            />
                        </UFormGroup>
                    </div>

                    <div class="grid grid-cols-2 gap-3 my-1">
                        <TuSelect
                            required
                            :options="selectIntervals"
                            v-model="formState.interval"
                            placeholder="Interval"
                        />
                        <TuSelect
                            required
                            :options="
                                ['Market', 'Limit'].map((el) => ({
                                    label: el,
                                    value: el,
                                }))
                            "
                            placeholder="Order type"
                            v-model="formState.order_type"
                        />
                    </div>
                    <div
                        v-if="formState.type == 'normal'"
                        class="grid grid-cols-1 gap-3 my-1"
                    >
                        <TuSelect
                            required
                            :options="toSelectStrategies(strategies)"
                            v-model="formState.strategy"
                            searchable
                            placeholder="Strategy"
                            innerHint="Search strategy..."
                        />
                    </div>
                    <UFormGroup label="Description">
                        <UTextarea
                            v-model="formState.desc"
                            placeholder="Bot description..."
                        />
                    </UFormGroup>
                    <div
                        v-if="mode == 'Edit'"
                        class="flex items-center flex-row justify- gap-5"
                    >
                        <UCheckbox label="Demo" v-model="formState.demo" />
                    </div>
                    <p
                        v-if="err.length"
                        class="text-center text-xs text-red-400"
                    >
                        {{ err?.replace("tuned:", "") }}
                    </p>
                    <UFormGroup class="mt-">
                        <UButton
                            :loading="btnLoading"
                            type="submit"
                            label="Submit"
                            class="btn-primary w-full"
                            >Submit</UButton
                        >
                    </UFormGroup>
                </UForm>
            </tu-card>
        </template>
    </tu-modal>
</template> 

<script setup lang="ts">
import TuSelect from "./TuSelect.vue";
import { useAppStore } from "@/src/stores/app";
import { arbitTypes, botTypes, selectIntervals } from "~/utils/constants";
import { useUserStore } from "@/src/stores/user";
import { listToOpt, toSelectStrategies } from "~/utils/funcs";
import { type IObj } from "@repo/common/src/utils/interfaces";
import { storeToRefs } from "pinia";
import { localApi } from "~/utils/api";

const userStore = useUserStore();

const { strategies, platforms } = storeToRefs(useAppStore());

const props = withDefaults(
    defineProps<{
        mode?: "Create" | "Edit";
        modelValue: boolean;
        bot?: IObj;
        onDone?: (bot: IObj) => any;
    }>(),
    {
        mode: "Create",
    }
);

const emit = defineEmits(["update:modelValue"]);
const modalOpen = computed({
    get: () => props.modelValue,
    set: (val) => emit("update:modelValue", val),
});

const formState = ref<IObj>({
        demo: true,
        platform: "bybit",
        type: "normal",
        child_pairs: [],
        arbit_settings: {
            _type: "tri",
            min_perc: 1,
            flipped: false,
            use_ws: false,
        },
    }),
    err = ref(""),
    setErr = (val: string) => (err.value = val);
const btnLoading = ref(false),
    setBtnLoading = (val: boolean) => (btnLoading.value = val);

const handleSubmit = async () => {
    try {
        setErr("");
        let data = { ...formState.value };
        delete data.id;
        delete data.orders;
        delete data.aside;
        delete data.total_base;
        delete data.total_quote;
        delete data.arbit_orders;
        const { mode, bot, onDone } = props;
        console.log(data.symbol);
        data.symbol = data.symbol?.split(",");
        data =
            mode == "Create"
                ? { ...data, user: userStore.user?.username }
                : { key: "multi", val: { ...data } };
//        console.log(data);
        setBtnLoading(true);
        const url = mode == "Create" ? "/bots/create" : `/bots/${bot!.id}/edit`;

        const res = await localApi(true).post(url, data);
        onDone?.(res.data);
        setBtnLoading(false);
        modalOpen.value = false;
    } catch (e: any) {
        console.log(e);
        const _err =
            typeof e.response?.data == "string" &&
            e.response?.data?.startsWith("tuned:")
                ? e.response.data.replace("tuned:", "")
                : "Something went wrong";
        setErr(_err);
        setBtnLoading(false);
    }
};
watchEffect(() => {
    if (props.bot) formState.value = { ...formState.value, ...props.bot, };
});
</script>
