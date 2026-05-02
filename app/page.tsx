import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/badge";
import { Workspace } from "@/components/workspace";
import { defaultMemoryProfile } from "@/lib/memory-profile";

const principles = [
  "AI 是翻译官，不是老师。",
  "每个概念都应锚定到地点、路径或地标。",
  "输出必须始终允许用户继续修改。"
];

export default function HomePage() {
  return (
    <AppShell>
      <header className="flex flex-col gap-10 pb-10 pt-4 md:pb-14">
        <nav className="flex items-center justify-between">
          <div className="font-display text-2xl tracking-wide text-ink">Remember Better</div>
          <a
            href="#workspace"
            className="rounded-full border border-ink/15 bg-white/80 px-4 py-2 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
          >
            进入工作台
          </a>
        </nav>

        <div className="grid gap-8 md:grid-cols-[1.05fr_0.95fr] md:items-end">
          <div className="space-y-6">
            <Badge>MVP / 空间叙事型画像</Badge>
            <div className="space-y-4">
              <h1 className="max-w-4xl font-display text-5xl leading-[1.02] text-ink md:text-7xl">
                把学习材料翻译成你的记忆可以走进去的场景。
              </h1>
              <p className="max-w-2xl text-base leading-8 text-ink/76 md:text-lg">
                Remember Better 的第一版只聚焦一件事：把原始文本转成空间地图和第一人称回忆路线，
                让用户用自己的大脑语言建立知识结构。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="#workspace"
                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent/90"
              >
                开始生成
              </a>
              <a
                href="#principles"
                className="rounded-full border border-ink/15 bg-white/80 px-5 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
              >
                查看原则
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-card backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              当前画像
            </div>
            <h2 className="mt-3 font-display text-3xl text-ink">
              {defaultMemoryProfile.label}
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-ink/76">
              {defaultMemoryProfile.lens.map((item) => (
                <div key={item} className="rounded-2xl bg-paper px-4 py-3">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-8 pb-12">
        <Workspace />

        <section
          id="principles"
          className="grid gap-5 rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-card backdrop-blur md:grid-cols-3"
        >
          {principles.map((item, index) => (
            <article key={item} className="rounded-[1.5rem] bg-paper px-5 py-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                原则 0{index + 1}
              </div>
              <p className="mt-3 text-sm leading-7 text-ink/80">{item}</p>
            </article>
          ))}
        </section>
      </main>
    </AppShell>
  );
}
