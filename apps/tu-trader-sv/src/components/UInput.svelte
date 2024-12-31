<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLInputAttributes } from "svelte/elements";

    export interface IUInputProps extends HTMLInputAttributes {
        value?: any;
        override?: string;
        inputClass?: string;
        trailing?: Snippet;
        leading?: Snippet;
    }

    let {
        override = "",
        value = $bindable(),
        class: _class,
        trailing,
        leading, inputClass,
        disabled,
        ...props
    }: IUInputProps = $props();
    const defClass = override.split(" ").find((el) => el == "class")
        ? ""
        : "flex gap-3 items-center input input-bordered input-sm ";
</script>

<div class={`${defClass + _class || ''} ${disabled && 'disabled'}`}>
    {@render leading?.()}
    <input bind:value {...props} class={inputClass || ''} {disabled} />
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
