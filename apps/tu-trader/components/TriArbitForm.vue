<template>
    <div
                                class="grid sm:grid-cols-3 gap-3 items-end my-1 mt-2"
                            >
                                <UFormGroup label="Coin A" class="fs-14">
                                    <UInput
                                        required
                                        v-model="formState.A"
                                        placeholder="e.g USDT"
                                        title="The main QUOTE, e.g USDT"
                                        type="string"
                                        :disabled="
                                            mode == 'Edit' &&
                                            formState.orders?.length
                                        "
                                    />
                                </UFormGroup>
                                <UFormGroup label="Coin B" class="fs-14">
                                    <UInput
                                        required
                                        v-model="formState.B"
                                        placeholder="e.g USDC"
                                        title="The QUOTE for pair B, e.g USDC"
                                        type="string"
                                        :disabled="
                                            mode == 'Edit' &&
                                            formState.orders?.length
                                        "
                                    />
                                </UFormGroup>
                                <UFormGroup label="Coin C" class="fs-14">
                                    <UInput
                                        required
                                        v-model="formState.C"
                                        placeholder="e.g APEX"
                                        title="The BASE for pair C, e.g APEX"
                                        type="string"
                                        :disabled="
                                            mode == 'Edit' &&
                                            formState.orders?.length
                                        "
                                    />
                                </UFormGroup>
                            </div>
                           
</template>


<script setup lang="ts">

import { type IObj } from "@repo/common/src/utils/interfaces";
import { useUserStore } from "@/src/stores/user";
import { listToOpt } from "~/utils/funcs";
const userStore = useUserStore();

const props = withDefaults(
    defineProps<{
        mode?: "Create" | "Edit";
        modelValue: IObj;
        bot?: IObj;
        onDone?: (bot: IObj) => any;
    }>(),
    {
        mode: "Create",
    }
);

const emit = defineEmits(['update:model-value'])

const formState = computed({
    get: ()=> props.modelValue,
    set: v => emit('update:model-value', v)
})
</script>