<template>
    <div ref="drawer" class="drawer">
        <div class="content p-6">
                <div class="flex _jc-sb _ai-c">
                    <div class="txt-brand">
                        {{ SITE }}
                    </div>
                    <button
                        class="h-25px w-25px rounded-full card-borde flex _ai-c _jc-c"
                        @click="hideDrawer"
                    >
                        <i class="material-icons fs-18">close</i>
                    </button>
                </div>
                <div class="w-100p bg-card h-1px my-10"></div>
                <div class="drawer-body">
                    <ul>
                        <li>
                            <NuxtLink class="drawer-item" to="/">
                                <i class="material-icons">home</i>
                                <span>Home</span>
                            </NuxtLink>
                        </li>
                        <li>
                            <a href="#" class="drawer-item">
                                <i class="material-icons">email</i>
                                <span>Contact us</span>
                            </a>
                        </li>
                    </ul>
                    <ul>
                        <li >
                                <NuxtLink class="drawer-item">
                                    <i class="material-icons">info</i>
                                    <span>About</span>
                                </NuxtLink>
                        </li>
                    </ul>
                </div>
        </div>
    </div>
</template>
<script setup lang="ts">
const drawer = ref<HTMLDivElement>();

function hideDrawer(rm = false) {
    drawer.value!.classList.remove("open");
    if (rm) {
        drawer.value?.removeEventListener("click", handleOverlayClick);
    }
}
function handleOverlayClick(e: any) {
    const dr = drawer.value!;
    const cont = dr.querySelector(".content");
    if (!cont!.contains(e.target)) {
        hideDrawer();
    }
}
watch(
    drawer,
    (val) => {
        if (val) {
            val.addEventListener("click", handleOverlayClick);
        }
    },
    { deep: true, immediate: true }
);

onMounted(() => {
    return () => {
        console.log("On unmounted");
        hideDrawer(true);
    };
});
</script>
