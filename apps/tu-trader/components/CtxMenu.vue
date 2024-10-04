<template>
    <div>
        <div ref="togglerRef" class="toggler pointer" @click="toggleMenu">
            <slot name="toggler" />
        </div>
        <ctx-body
            v-model:size="size"
            ref="menuRef"
            class="hidden block"
            v-if="!isOpen"
            :set-menu="v => menu = v"
            ><slot name="children"
        /></ctx-body>
        <Teleport v-else to="#ctx-overlay">
            <CtxBody
                :style="`top: ${y ?? 0}%;left: ${x ?? 0}%`"
                v-model:size="size"
                :set-menu="v => menu = v"
                ><slot name="children"
            /></CtxBody>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import $ from "jquery";
import CtxBody from "./CtxBody.vue";
const x = ref(0),
    y = ref(0);

const menuRef = ref<any>(),
    togglerRef = ref<HTMLDivElement>();
const menu = ref<any>()

const size = ref({ w: 0, h: 0 }),
    pos = ref({ x: 0, y: 0 });

const props = defineProps({
    modelValue: Boolean,
});
const emits = defineEmits(["update:model-value"]);

const isOpen = computed({
    get: () => props.modelValue,
    set: (val) => emits("update:model-value", val),
});

const setMenuPos = () => {
    let { x: _x, y: _y } = pos.value;

    let { w, h } = size.value;

    const {clientHeight, cleintWidth} = menu.value
    w = cleintWidth ?? w
    h = clientHeight ?? h

    const rightPos = _x + w;
    const bottomPos = _y + h;

    let deltaW = window.innerWidth - _x;
    let deltaH = window.innerHeight - _y;

    if (rightPos > window.innerWidth) {
        let newLeft = _x - w; //window.innerWidth - size.w - deltaW;
        _x = newLeft;
    }

    if (bottomPos > window.innerHeight) {
        let newTop = _y - h// window.innerHeight - h - deltaH;
        _y = newTop;
    }

    x.value = (_x / window.innerWidth) * 100;
    y.value = (_y / window.innerHeight) * 100;
};
const toggleMenu = async (e: any) => {
    isOpen.value = true;

    e.preventDefault();
    e.stopPropagation();

    const toggler: HTMLDivElement = togglerRef.value!;
    let _menu: HTMLDivElement = menu.value!;
    const togglerRect = toggler.getBoundingClientRect();

    const clientX = togglerRect.left; //winSize.w - (togglerSize.w ?? 0 / 2);
    const clientY = togglerRect.top; //winSize.h - (togglerSize.h ?? 0 / 2);//{ clientX, clientY } = e;
    let _pos = {
        x: clientX + togglerRect.width / 2,
        y: clientY + togglerRect.height / 2,
    };
    pos.value = _pos;

    setMenuPos();
    updateListener()
};

watch(size, (s) => {
    setMenuPos();
});

const route = useRoute();
const pth = ref(route.fullPath);
const updateListener = () => {
    document.body.addEventListener("mouseup", onDocClick);
};

const onDocClick = (e: any) => {
    const _menu = menu.value;
    if (_menu && !_menu.contains(e.target)) {
        isOpen.value = false
    }
};

onMounted(() => {
    updateListener();
});



watch(
    () => route.fullPath,
    () => {
        isOpen.value = false;
    },
    { deep: true, immediate: true }
);
</script>
