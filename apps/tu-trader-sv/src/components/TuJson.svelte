<script lang="ts">
    import type { IObj } from "@cmn/utils/interfaces";
    import type { HTMLAttributes } from "svelte/elements";

    interface IProps extends HTMLAttributes<HTMLDivElement>{data: IObj}
    const {data, class: _class, ...props} : IProps = $props()
</script>
<div class={"badge rounded-md fs-12 fw-7 " + _class} {...props}>{ JSON.stringify(data) }</div>