<script lang="ts">
    import UFormGroup from "./UFormGroup.svelte";

    let {
        disabled,
        toggle,
        value = $bindable(),
        class: _class,
        ...props
    }: {
        disabled?: boolean;
        value?: boolean;
        [key: string]: any;
        toggle?: boolean;
    } = $props();
</script>

<UFormGroup
    class={"text-center flex items-end fs-15 gap-1.5 justify-end mt-1 " +
        _class}
    style="flex-direction: row-reverse; width: fit-content"
    labelClass="!mb-0"
    {...props}
    labelStyle="line-height: 1rem"
>
    <input
        {disabled}
        type="checkbox"
        class={toggle
            ? "toggle"
            : "checkbox checkbox-xs checkbox-primary border-card"}
        bind:checked={value}
    />
</UFormGroup>
