<script lang="ts">
    import { ROOT, SITE, SITE_SLOGAN } from "@/lib/constants";
    import { appStore } from "@/stores/app.svelte";
    import { DEVELOPER } from "@cmn/utils/consts3";

    const _title = `${SITE} - ${SITE_SLOGAN}`;
    const _description = `${SITE} is a Tunedbass site`;

    let {
        title = SITE,
        src = ROOT + "/assets/images/meta/home.png",
        desc = `${SITE} site`,
        keywords = SITE.toLowerCase(),
        url
    }: {
        title?: string;
        src?: string;
        desc?: string;
        url?: string;
        keywords?: string;
    } = $props();

    

    // useHead({
    //     script: [

    //         // Google Analyticts
    //         {
    //             async: true,
    //             src: "https://www.googletagmanager.com/gtag/js?id=G-NMN9VWLJ6B"
    //         },
    //         {
    //             innerHTML: `
    //             window.dataLayer = window.dataLayer || [];
    //             function gtag(){dataLayer.push(arguments);}
    //             gtag('js', new Date());

    //             gtag('config', 'G-NMN9VWLJ6B');
    //             `
    //         }
    //     ]
    // })
</script>

<svelte:head>
    <title>
       {title || _title}
    </title>
    <meta name="description" content={`${desc}\n${_description}`} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={url} />
    <meta property="og:title" content={title || _title} />
    <meta property="og:description" content={`${desc}\n${_description}`} />
    <meta property="og:image" content={src} />

    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content={url} />
    <meta property="twitter:title" content={title || _title} />
    <meta property="twitter:description" content={`${desc}\n${_description}`} />
    <meta property="twitter:image" content={src} />

    <meta name="author" content={DEVELOPER} />
    <meta name="publisher" content={DEVELOPER} />
    <meta name="copyright" content="{SITE}" />
</svelte:head>
