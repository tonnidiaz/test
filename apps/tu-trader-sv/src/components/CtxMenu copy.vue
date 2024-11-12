<template>
    <div>
        <div ref="togglerRef" class="toggler pointer" @click="toggleMenu">
            <slot name="toggler" />
        </div>
        <ctx-body v-model:size="size" ref="menuRef" class=" hidden block" v-if="!isOpen" ><slot name="children"/></ctx-body>
        <Teleport v-else to="#ctx-overlay">
            <CtxBody
                    :style="`top: ${y ?? 0}%;left: ${x ?? 0}%`" v-model:size="size"><slot name="children"/></CtxBody>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import $ from "jquery";
import CtxBody from "./CtxBody.vue";
const x = ref(0),
    y = ref(0);

const menuRef = ref<any>(), menuSkeleton = ref<any>(), togglerRef = ref<HTMLDivElement>();

const size = ref({w: 0, h: 0}), pos = ref({x: 0, y: 0})

const props = defineProps({
  modelValue: Boolean
});
const emits = defineEmits(["update:model-value"])

const isOpen = computed({
    get: ()=> props.modelValue, set: (val)=> emits("update:model-value", val)
})

const setMenuPos = (w, h, _x, _y) =>{
    x.value = _x / window.innerWidth * 100
    y.value = _y / window.innerHeight * 100
}
const toggleMenu = async (e: any) => {
    isOpen.value = true

    e.preventDefault();
    e.stopPropagation();
    
    const toggler: HTMLDivElement = togglerRef.value!
    let _menu: HTMLDivElement = menuSkeleton.value!;
    const menuRect = _menu.getBoundingClientRect()
    const _size = size.value//{ w: $(_menu).width()!, h: $(_menu).height()! };//{w: menuRect.width, h: menuRect.height}
    console.log({_size})
    const togglerRect = toggler.getBoundingClientRect()
    const winSize = {w: window.innerWidth, h: window.innerHeight}

    const clientX = togglerRect.left//winSize.w - (togglerSize.w ?? 0 / 2);
    const clientY = togglerRect.top //winSize.h - (togglerSize.h ?? 0 / 2);//{ clientX, clientY } = e;
    let _pos = { x: clientX + togglerRect.width / 2, y: clientY + togglerRect.height / 2 };
    const rightPos = clientX + _size.w;
    const bottomPos = clientY + _size.h;

    let deltaW = window.innerWidth - clientX;
    let deltaH = window.innerHeight - clientY;

    if (rightPos > window.innerWidth) {
        let newLeft = _pos.x - _size.w//window.innerWidth - size.w - deltaW;
        console.log(_size.w, deltaW);
        _pos.x = newLeft;
    }

    if (bottomPos > window.innerHeight) {
        let newTop = window.innerHeight - _size.h - deltaH;
        //_pos.y = newTop;
    }

    setMenuPos(0, 0, _pos.x, _pos.y)    
    
};

watch(size, s=>{
    console.log({s})
})

const route = useRoute()
const pth = ref(route.fullPath)
const updateListener = () => {
    document.body.addEventListener("mouseup", onDocClick);
};

const onDocClick = (e: any) => {
    const _menu = menuSkeleton.value;
    if (_menu && !_menu.contains(e.target)) {
        isOpen.value = false
    }
};

onMounted(()=>{
    updateListener()
})

watch(menuRef, (v)=>{
    //console.log({v:v.menu});
    if (v)
   { menuSkeleton.value = v.menu;
    console.log($(v.menu).width())
   }
})

watch(()=>route.fullPath, ()=>{
    isOpen.value = false
}, {deep: true, immediate: true})



</script>
