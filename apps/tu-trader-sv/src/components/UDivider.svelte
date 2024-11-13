<div class={"devider border-1 border-card w-100 " + _class} {...props}></div>
<script lang="ts">
    import type { HTMLAttributes } from "svelte/elements";


    interface IProps extends HTMLAttributes<any>{}
    const {class: _class, ...props}: IProps = $props()
</script>