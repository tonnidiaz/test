<template>
    <aside >
        <ul class="menu gap-0 sm:gap-5  sidebar">
   
    
    <menu-item
            title="Home"
                inner-class="justify-center"
                icon="fi fi-rr-house-window"
                to="/"
            />
            
            <menu-item title="Backtest"
                
                inner-class="justify-center"
                icon="fi fi-rr-blood-test-tube-alt"
                to="/backtest"
            ></menu-item>
          
           
            <menu-item title="Coin test"
                
                inner-class="justify-center"
                icon="fi fi-rr-coins"
                to="/test/coins"
            ></menu-item>
            <menu-item title="Arbitrage Coin test"
                
                inner-class="justify-center"
                icon="fi fi-rr-money-transfer-coin-arrow"
                to="/test/arbit/coins"
            ></menu-item>
           
</ul>
    </aside>
</template>

<script setup lang="ts"></script>
