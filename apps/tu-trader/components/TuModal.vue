<template>
    <label
        :for="id"
        @click="
            (e) => {
                e.preventDefault();
                e.stopPropagation();
                modalOpen = true;
            }
        "
    >
        <slot name="toggler" />
    </label>

    <!-- Put this part before </body> tag -->
    <Teleport to="#ctx-overlay">
        <div :class="`modal modal-md ${modalOpen ? 'modal-open' : ''}`">
            <TuModalContainer v-model="modalOpen" blank>
                <div class="modal-box min-w-400">
                    <slot name="content" />
                </div>
            </TuModalContainer>

            <label class="modal-backdrop" :for="id">Close</label>
        </div></Teleport
    >
    <input class="checkbox hidden" type="checkbox" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

const id = ref("");

const props = defineProps({
    modelValue: Boolean,
});

const emit = defineEmits(["update:model-value"]);

const modalOpen = computed({
    get: () => props.modelValue,
    set: (val) => emit("update:model-value", val),
});

onMounted(() => {
    id.value = `modal-${Date.now()}`;
});
</script>
<style lang="scss"></style>
