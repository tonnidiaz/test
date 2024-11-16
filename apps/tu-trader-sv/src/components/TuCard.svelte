<div class={"card " + _class} {...props}>
    {@render header?.()}
    <div class="devider mb-3"></div>
    {@render children?.()}
</div>

<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLAttributes } from "svelte/elements";


    interface IProps extends HTMLAttributes<any>{header?: Snippet}
    const {children, header, class: _class, ...props} : IProps = $props()
</script>