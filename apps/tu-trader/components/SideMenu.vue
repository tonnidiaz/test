<template>
    <div class="sidemenu">
        <nav class="navbar navbar-dark container">
            <div class="" id="navbarNav">
                <ul class="navbar-nav">
                    <li class="nav-item" @click="hide">
                        <NuxtLink to="/contact" class="nav-link">
                            Contact us
                        </NuxtLink>
                    </li>
                </ul>
            </div>
        </nav>
    </div>
</template>

<script setup lang="ts">
import $ from "jquery";

function showGenres() {
    $(".genres").addClass("active");
}
function hide() {}

function hideGenres() {
    $(".genres").removeClass("active");
}
</script>
