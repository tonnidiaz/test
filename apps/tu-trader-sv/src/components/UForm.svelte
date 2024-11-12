
    <form onsubmit={_onSubmit} {...props}>
        {@render children?.()}
    </form>

<script lang="ts">
import type {HTMLFormAttributes} from 'svelte/elements'

interface IProps extends HTMLFormAttributes {onSubmit: (e: any)=>any}

let {children,...props} : IProps = $props()
const _onSubmit = async (e: any)=>{
    e.preventDefault()
    const btns = [...e.target.querySelectorAll('button[type=submit]')]
    btns.forEach((btn: any)=>{
        btn.disabled = true})
        await props.onSubmit?.(e)
    btns.forEach((btn: any)=>btn.disabled = false)
}
</script>