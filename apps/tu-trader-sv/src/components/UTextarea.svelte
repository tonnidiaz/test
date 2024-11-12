<script lang="ts">
    import type { HTMLTextareaAttributes } from "svelte/elements";
    interface IProps extends HTMLTextareaAttributes {value?: any}
    let {value = $bindable() ,...props }: IProps = $props();
</script>

<textarea bind:value={value} style="resize: both;" class="textarea textarea-bordered" {...props}
></textarea>
