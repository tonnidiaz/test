<script lang="ts">
    import type { HTMLAttributes } from "svelte/elements";

    interface IProps extends HTMLAttributes<HTMLDivElement>{label?: string}
    const {label, class: _class, ...props} : IProps = $props()
</script>
<div class={"badge rounded-md fs-12 fw-7 " + _class} {...props}>{ label }</div>