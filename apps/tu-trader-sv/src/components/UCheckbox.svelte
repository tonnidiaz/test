
    <UFormGroup class={"text-center flex items-end fs-15 gap-1.5 justify-end " + _class} style="flex-direction: row-reverse; width: fit-content" labelClass="mb-0" {...props}>
        <input
            
            disabled={disabled}
            type="checkbox"
            class="checkbox checkbox-xs checkbox-primary border-card"
            bind:checked={value}
        />
    </UFormGroup>

<script lang="ts">
    import UFormGroup from "./UFormGroup.svelte";

    let {disabled, value = $bindable(), class: _class,...props}: {disabled?: boolean, value?: boolean; [key: string]: any} = $props()
</script>
