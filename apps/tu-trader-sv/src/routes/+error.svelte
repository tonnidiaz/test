<TMeta title={`${$page.status}: ${$page.error.message.replace("tu:", "")} - ${SITE}`}/>
<div class="tu-error-page">
    <div class="error">
        <span class="status">{$page.status}</span>
        <div class="message">
            <h1>{$page.error.message.replace("tu:", "")}</h1>
        </div>
    </div>
</div>

<script lang="ts">
    import {page} from "$app/stores"
    import TMeta from "@/components/TMeta.svelte";
    import { SITE } from "@/lib/constants";
</script>
<style lang="scss">

    .tu-error-page{
        height: 100vh;
        width: 100vw;
        display: flex;
        justify-content: center;
        align-items: center;
        position: fixed;
        top: 0; left: 0;
        // z-index: 99;
    }
    .error {
    display: flex;
    align-items: center;
    max-width: 32rem;
    margin: 0 1rem;
}
.status {
    font-weight: 200;
    font-size: 3rem;
    line-height: 1;
    position: relative;
    top: -0.05rem;
}
.message {
    border-left: 1px solid #666;
    padding: 0 0 0 1rem;
    margin: 0 0 0 1rem;
    min-height: 2.5rem;
    display: flex;
    align-items: center;
}
</style>