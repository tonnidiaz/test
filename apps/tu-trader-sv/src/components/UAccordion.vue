<template>
    <details class="collapse collapse-arrow border border-card bg-base-100 collapse-sm">
        <summary class="collapse-title text-l font-medium">
            <slot name="label"/>
        </summary>
        <div class="collapse-content">
            <slot name="content"/>
        </div>
    </details>
</template>

<style lang="scss">
.collapse-content{
    //padding: 0 !important;
}
</style>