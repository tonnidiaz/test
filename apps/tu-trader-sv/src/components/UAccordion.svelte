    <details class={"collapse collapse-arrow border border-card bg-base-100 collapse-sm " + _class} {...props}>
        <summary class="collapse-title text-l font-medium">
            {@render label?.()}
        </summary>
        <div class="collapse-content">
            {@render content?.()}
        </div>
    </details>

<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLDetailsAttributes } from "svelte/elements";

    interface IProps extends HTMLDetailsAttributes{label?: Snippet; content?: Snippet; multiple?: boolean}
    const {label, content, class: _class, multiple, ...props} : IProps = $props()
</script>