<button class={`btn btn-sm ` + _class} type="button" {...props}>{@render children?.()}
    {#if loading}
    <span class="loading loading-spinner loading-sm"></span>
    {/if}
</button>
<script lang="ts">
    import type {HTMLButtonAttributes} from 'svelte/elements'

    interface IProps extends HTMLButtonAttributes {loading?: boolean}
    let {children, class: _class, loading,...props } : IProps = $props()
</script>