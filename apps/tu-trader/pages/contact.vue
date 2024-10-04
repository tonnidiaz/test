<template>
    <div class="p-2 body">
      <TMeta :title="`Contact us - ${SITE}`" :url="ROOT + '/contact'" />
      <fieldset class="p-3 my-10  w-80 w-sm-full m-auto card shadow-xl bg-base-100 border-card border-1">
        <legend class="fs-20 font-bold"><h1> Contact us</h1></legend>
        <form action="#" @submit="contactUs">
          <div class="form-control">
            <label class="label" for="fullname">Full name:</label>
            <input
              required
              name="name"
              id="fullname"
              type="text"
              class="input input-bordered w-full"
              placeholder="Enter your full name..."
            />
          </div>
          <div class="form-control">
            <label class="label" for="email">Email address:</label>
            <input
              reuired
              name="email"
              id="email"
              type="email"
              placeholder="Enter your Email address..."
              class="input input-bordered w-full"
            />
          </div>
          <div class="form-control">
            <label class="label" for="msg">Message:</label>
            <textarea placeholder="What is your query?" required name="message" id="msg" class="input input-bordered w-full" />
          </div>
          <div class="form-control mt-4 mb-3">
            <button class="btn bg-primary hover:bg-accent btn-md  w-100p border-body text-black" type="submit">
              Submit
            </button>
          </div>
        </form>
        <p class="t-c">
          Or email us at:
          <a :href="`mailto:${EMAIL}`" class="link">
            {{EMAIL}}</a
          >
        </p>
      </fieldset>
    </div>
  </template>

  <script setup lang="ts">
  import {ROOT, SITE, EMAIL} from '@/utils/constants';
import $ from "jquery"

function contactUs(e: any) {
      e.preventDefault();

      const form = e.currentTarget;
      const btn = $(form.querySelector("button"));
      const { name, email, message } = form;

      const fd = new FormData();
      fd.append("name", name.value);
      fd.append("email", email.value);
      fd.append("message", message.value);
      $(".inProgress").show();
      btn.text("Sending message...");
      btn[0].disabled = true

    }
</script>