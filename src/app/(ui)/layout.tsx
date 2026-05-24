import { TabNav } from "@/components/TabNav";

export default function UiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TabNav />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </>
  );
}
