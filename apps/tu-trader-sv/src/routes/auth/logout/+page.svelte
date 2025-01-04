<div class="h-100vh w-100vw flex items-center justify-center">
    <TMeta title={`Logout - ${SITE}`} />

    <h1 class="text-center text-xl">Signing out...</h1>
</div>
<script lang="ts">
    import TMeta from "@/components/TMeta.svelte";
    import { SITE, STORAGE_KEYS } from "@/lib/constants";
    import { setUser } from "@/stores/user.svelte";
    import { onMount } from "svelte";

    onMount(()=>{
        setUser(null)
        localStorage.removeItem(STORAGE_KEYS.authTkn);
        location.href = "/";
    })
</script>