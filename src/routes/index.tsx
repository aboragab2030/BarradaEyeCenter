import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// The clinic app keeps its data in the browser (saved settings, sessions), so it renders in the browser only.
const Index = lazy(() => import("@/pages/Index"));

const TITLE = "مركز برادة للعيون بالاقصر";
const DESCRIPTION = "صفحة حجز طبى لمركز برادة للعيون بالاقصر";
const OG_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f63e59d7-1dfa-44b4-8788-733d978535b2/id-preview-6f992603--ecb991e6-d62f-4c0f-8abf-43f0d27e34da.lovable.app-1773534592318.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <ClientOnly fallback={<div className="min-h-screen" />}>
      <Suspense fallback={<div className="min-h-screen" />}>
        <Index />
      </Suspense>
    </ClientOnly>
  );
}
