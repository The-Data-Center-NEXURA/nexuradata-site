import { Target } from "lucide-react";
import { problems } from "@/data/site";

export default function Problems() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">The Problem</p>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Growth breaks weak operations.</h2>
          <p className="mt-5 text-lg text-slate-300">
            Most companies do not need more software. They need connected systems that remove friction and turn execution into a repeatable advantage.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {problems.map((problem) => (
            <div key={problem} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-slate-200">
              <Target className="mb-4 text-blue-400" size={22} />
              {problem}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}