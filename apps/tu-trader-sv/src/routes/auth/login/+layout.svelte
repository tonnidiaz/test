<div class="h-100vh relative layout">
    <main class="h-100p w-100p flex flex-col items-center justify-center">{@render children()}</main>
</div>
<script lang="ts">

let { children } = $props();
</script>
<style lang="scss" scoped>
    .layout{
        background-color: red;
        width: 100vw;
        top: 0;
        left: 0
    }
</style>