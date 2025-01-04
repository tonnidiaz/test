<button class={"btn btn-sm " + _class} type="button" {...props}>{@render children?.()}</button>
<script lang="ts">
    import type {HTMLButtonAttributes} from 'svelte/elements'

    interface IProps extends HTMLButtonAttributes {}
    let {children, class: _class,...props } : IProps = $props()
</script>