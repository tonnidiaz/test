<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLInputAttributes } from "svelte/elements";

    interface IProps extends HTMLInputAttributes {
        value?: any;
        override?: string;
        trailing?: Snippet;
        leading?: Snippet;
    }

    let {
        override = "",
        value = $bindable(),
        class: _class,
        trailing,
        leading,
        ...props
    }: IProps = $props();
    const defClass = override.split(" ").find((el) => el == "class")
        ? ""
        : "flex gap-3 items-center input input-bordered input-sm ";
</script>

<div class={defClass + _class || ''}>
    {@render leading?.()}
    <input autocomplete="on" bind:value {...props} />
    {@render trailing?.()}
</div>

<style lang="scss">
    .input {
        display: flex;
        flex-direction: row;
        gap: 4px;
        align-items: center;
        .trailing {
            align-self: flex-end;
        }
    }
</style>
