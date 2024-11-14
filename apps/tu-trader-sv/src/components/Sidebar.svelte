<script lang="ts">
    import MenuItem from "./MenuItem.svelte";
</script>

<aside>
    <ul class="menu gap-0 sm:gap-5 sidebar">
        <MenuItem
            title="Home"
            innerClass="justify-center"
            icon="fi fi-rr-house-window"
            to="/"
        />

        <MenuItem
            title="Backtest"
            innerClass="justify-center"
            icon="fi fi-rr-blood-test-tube-alt"
            to="/backtest"
        ></MenuItem>

        <MenuItem
            title="Coin test"
            innerClass="justify-center"
            icon="fi fi-rr-coins"
            to="/test/coins"
        ></MenuItem>
        <MenuItem
            title="Arbitrage Coin test"
            innerClass="justify-center"
            icon="fi fi-rr-money-transfer-coin-arrow"
            to="/test/arbit/coins"
        ></MenuItem>
    </ul>
</aside>
