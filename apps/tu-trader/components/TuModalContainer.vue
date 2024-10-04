<template>
    <div
        ref="modalRef"
        :class="`tu-modal__cont ${!blank ? 'tu-modal-cont p-4 border-1 border-card br-10 params-area bg-base-100 shadow-lg' : ''} ${
            open ? 'open' : ''
        }`"
    >
        <slot />
    </div>
</template>

<script lang="ts" setup>
import $ from "jquery";
import { ref, computed, onMounted, onUnmounted } from "vue";
const modalRef = ref<HTMLDivElement>();
const props = defineProps({
    modelValue: Boolean,
    blank: {type: Boolean, default: false}
});

const emit = defineEmits(["update:model-value"])

const open = computed({
    get: ()=> props.modelValue,
    set: (val) => {emit('update:model-value', val)}
})
const _onDocClick = (ev) => {
    const modal = modalRef.value;
    const overlay = document.getElementById('ctx-overlay')
    if (!modal) return;
    const isChild = modal.contains(ev.target) || overlay?.contains(ev.target);
    if (!isChild) {
        open.value = false
        //$(modal!).removeClass("open");
        
    }
};
const _onOverlayClick = (ev: any)=>{
    const modals = document.querySelectorAll('.tu-modal__cont');
    const menus = document.querySelectorAll('.menu');
   
    const isChild = [...modals].some(el=> el.contains(ev.target)) || [...menus].some(el=> el.contains(ev.target))
    if (!isChild) open.value = false
}
onMounted(() => {
    // document.removeEventListener("mouseup", _onDocClick);
    // document.addEventListener("mouseup", _onDocClick);
    const ctxOverlay = document.getElementById('ctx-overlay')
    ctxOverlay?.removeEventListener('mouseup', _onOverlayClick)
    ctxOverlay?.addEventListener('mouseup', _onOverlayClick)
});

onUnmounted(()=>{
    const ctxOverlay = document.getElementById('ctx-overlay')
    ctxOverlay?.removeEventListener('mouseup', _onOverlayClick)
})
</script>
