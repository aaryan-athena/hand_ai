import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center space-y-2 mb-12">
        <h1 className="text-4xl font-bold tracking-tight">HandRehab AI</h1>
        <p className="text-slate-400 text-lg">
          Computer-vision hand rehabilitation exercises, scoring, and progress tracking —
          webcam only, no extra hardware.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link
          href="/physician"
          className="group rounded-xl border border-white/10 bg-white/5 p-8 hover:border-cyan-400/50 hover:bg-white/10 transition-colors"
        >
          <div className="text-4xl mb-3">🩺</div>
          <h2 className="text-xl font-semibold mb-1">I&apos;m a Physician</h2>
          <p className="text-sm text-slate-400">
            Demonstrate exercises to calibrate thresholds, assign them to patients, and review
            progress reports.
          </p>
        </Link>

        <Link
          href="/patient"
          className="group rounded-xl border border-white/10 bg-white/5 p-8 hover:border-orange-400/50 hover:bg-white/10 transition-colors"
        >
          <div className="text-4xl mb-3">🖐️</div>
          <h2 className="text-xl font-semibold mb-1">I&apos;m a Patient</h2>
          <p className="text-sm text-slate-400">
            Do your prescribed hand exercises at home with real-time AI feedback and scoring.
          </p>
        </Link>
      </div>
    </div>
  );
}
