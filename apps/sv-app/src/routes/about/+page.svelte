<h1>Hello my name is {name}</h1> 
<input placeholder="name..." value="{name}" oninput="{(e : any)=> {name = e.target.value || ""}}">
<script lang="ts">
    let name = $state("Tonni")
</script>