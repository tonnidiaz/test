<script lang="ts">
    import { format, isDate } from "date-fns";
    let modalOpen = $state(false);

    // import "v-calendar/dist/style.css";
    import UInput from "./UInput.svelte";
    import { untrack } from "svelte";
    import { isValidDate } from "@/lib/funcs";
    import CtxMenu2 from "./CtxMenu2.svelte";

    interface IProps {
        value?: { start: string; end: string };
    }
    const {
        value = $bindable({
            start: new Date(Date.now() - 2 * 24 * 3600 * 1000)
                .toISOString()
                .slice(0, 16),
            end: new Date().toISOString().slice(0, 16),
        }),
        ...props
    }: IProps = $props();

    $effect(() => {
        const _date = value;
        const { start, end } = _date;
        const y1 = start.split("-")[0];
        const y2 = end.split("-")[0];
        const _end = end?.replaceAll(y2, y1);
        untrack(() => {
            if (isValidDate(_end)) value.end = _end;
        });
    });
</script>

<CtxMenu2 bind:open={modalOpen}>
    {#snippet toggler()}
        <div class="btn btn-primary btn-sm">
            {format(new Date(value.start), "d MMM, yyy, hh:mm")} -
            {format(new Date(value.end), "d MMM, yyy, hh:mm")}
        </div>
    {/snippet}

    <!-- Children -->
    <div class="card p-2">
        <div class="card-header p-2">
            <h3>Select range</h3>
        </div>
        <div
            class="rounded-m sm:flex-row flex flex-col items-center justify-center gap-3"
        >
            <UInput type="datetime-local" bind:value={value.start} />
            <UInput type="datetime-local" bind:value={value.end} />
        </div>
    </div>
</CtxMenu2>
