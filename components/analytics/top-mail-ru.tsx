"use client"

import Script from "next/script"

const TOP_MAIL_RU_ID = 3741625

export function TopMailRu() {
    return (
        <>
            <Script id="top-mail-ru" strategy="afterInteractive">
                {`
          var _tmr = window._tmr || (window._tmr = []);
          _tmr.push({id: "${TOP_MAIL_RU_ID}", type: "pageView", start: (new Date()).getTime()});
          (function (d, w, id) {
            if (d.getElementById(id)) return;
            var ts = d.createElement("script"); ts.type = "text/javascript"; ts.async = true; ts.id = id;
            ts.src = "https://top-fwz1.mail.ru/js/code.js";
            var f = function () {var s = d.getElementsByTagName("script")[0]; s.parentNode.insertBefore(ts, s);};
            if (w.opera == "[object Opera]") { d.addEventListener("DOMContentLoaded", f, false); } else { f(); }
          })(document, window, "tmr-code");
        `}
            </Script>
            <noscript>
                <div>
                    <img
                        src={`https://top-fwz1.mail.ru/counter?id=${TOP_MAIL_RU_ID};js=na`}
                        style={{ position: "absolute", left: "-9999px" }}
                        alt="Top.Mail.Ru"
                    />
                </div>
            </noscript>
        </>
    )
}
