<script lang="ts">
    import type { IObj } from "@cmn/utils/interfaces";
    import UFormGroup from "./UFormGroup.svelte";
    import UInput from "./UInput.svelte";

    interface IProps {
        mode?: "Create" | "Edit";
        value: IObj;
        bot?: IObj;
        onDone?: (bot: IObj) => any;
    }
    let { value: formState = $bindable(), bot, onDone, mode = "Create" }: IProps = $props();
</script>

<div class="grid sm:grid-cols-3 gap-3 items-end my-1 mt-2">
    <UFormGroup label="Coin A" class="fs-14">
        <UInput
            required
            bind:value={formState.A}
            placeholder="e.g USDT"
            title="The main QUOTE, e.g USDT"
            type="string"
            disabled={mode == "Edit" && formState.orders?.length}
        />
    </UFormGroup>
    <UFormGroup label="Coin B" class="fs-14">
        <UInput
            required
            bind:value={formState.B}
            placeholder="e.g USDC"
            title="The QUOTE for pair B, e.g USDC"
            type="string"
            disabled={mode == "Edit" && formState.orders?.length}
        />
    </UFormGroup>
    <UFormGroup label="Coin C" class="fs-14">
        <UInput
            required
            bind:value={formState.C}
            placeholder="e.g APEX"
            title="The BASE for pair C, e.g APEX"
            type="string"
            disabled={formState.arbit_settings.super_mega || (mode == "Edit" && formState.orders?.length)}
        />
    </UFormGroup>
</div>
