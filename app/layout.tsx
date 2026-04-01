import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { DisableContextMenu } from "@/components/disable-context-menu";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_DESCRIPTION}`,
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // To defeat extensions that patch Event.prototype early, we can steal pristine methods from an iframe
                var iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                document.documentElement.appendChild(iframe);
                
                var PristineEvent = iframe.contentWindow.Event;
                var pristineStopImmediate = PristineEvent.prototype.stopImmediatePropagation;
                var pristinePreventDefault = PristineEvent.prototype.preventDefault;
                var pristineAddEventListener = iframe.contentWindow.EventTarget.prototype.addEventListener;
                
                function isForm(el) {
                  if (!el || !el.tagName) return false;
                  var t = el.tagName.toLowerCase();
                  return t === "input" || t === "textarea" || t === "select" || t === "button" || el.isContentEditable;
                }

                function kill(e) {
                  pristinePreventDefault.call(e);
                  e.stopPropagation();
                  pristineStopImmediate.call(e);
                  e.returnValue = false;
                  return false;
                }
                
                function killCopy(e) {
                  if(isForm(e.target)) return;
                  kill(e);
                }

                // Force attach using the pristine method so the extension's patched method is bypassed
                pristineAddEventListener.call(window, "contextmenu", kill, { capture: true, passive: false });
                pristineAddEventListener.call(document, "contextmenu", kill, { capture: true, passive: false });
                pristineAddEventListener.call(window, "copy", killCopy, { capture: true, passive: false });
                pristineAddEventListener.call(document, "copy", killCopy, { capture: true, passive: false });
                
                // Mousedown right-click prevention as another layer
                pristineAddEventListener.call(window, "mousedown", function(e) {
                  if (e.button === 2 || e.button === 3) kill(e);
                }, { capture: true, passive: false });
                
                // Intercept properties
                var props = ['oncontextmenu', 'oncopy', 'oncut', 'onpaste'];
                [Window.prototype, Document.prototype, HTMLElement.prototype].forEach(function(target) {
                  props.forEach(function(p) {
                    try {
                      Object.defineProperty(target, p, {
                        get: function() { return kill; },
                        set: function() {},
                        configurable: false,
                        enumerable: true
                      });
                    } catch(e) {}
                  });
                });

                // Periodic enforcement
                setInterval(function() {
                  window.oncontextmenu = kill;
                  document.oncontextmenu = kill;
                  if (document.body) document.body.oncontextmenu = kill;
                }, 50);
              })();
            `,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <DisableContextMenu />
        <ThemeProvider>
          {children}
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
