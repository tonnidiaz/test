import React from 'react';
import { SITE, ROOT, DEVELOPER, SITE_SLOGAN } from '../utils/constants';

const TMeta = ({
    title = "Tu",
    src = `${ROOT}/assets/images/meta/home.png`,
    desc = '',
    url = ROOT,
    keywords = ''
}) => {
    const _title = `${SITE} - ${SITE_SLOGAN}`;
    const _description = `${SITE} is a Tunedbass site`;

    return (
        <>
            <title>{title ?? _title}</title>
            <meta name="description" content={`${desc}\n${_description}`} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={url} />
            <meta property="og:title" content={title ?? _title} />
            <meta property="og:description" content={`${desc}\n${_description}`} />
            <meta property="og:image" content={src} />
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={url} />
            <meta property="twitter:title" content={title ?? _title} />
            <meta property="twitter:description" content={`${desc}\n${_description}`} />
            <meta property="twitter:image" content={src} />
            <meta name="author" content={DEVELOPER} />
            <meta name="publisher" content={DEVELOPER} />
            <meta name="copyright" content={SITE} />
            <script async src="https://www.googletagmanager.com/gtag/js?id=G-NMN9VWLJ6B"></script>
            <script>
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', 'G-NMN9VWLJ6B');
                `}
            </script>
        </>
    );
};

export default TMeta;