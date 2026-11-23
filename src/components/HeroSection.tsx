import { useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { HoneyStage3D, type HoneyStageMode } from './three/HoneyStage3D';

interface HeroSectionProps {
  brandCode: string;
  companyName: string;
  tagline: string;
  location: string;
}

const PARTICLES = [
  { top: '16%', left: '12%', size: 5, delay: '0s' },
  { top: '28%', left: '42%', size: 4, delay: '1.1s' },
  { top: '72%', left: '18%', size: 6, delay: '0.6s' },
  { top: '64%', left: '48%', size: 4, delay: '1.8s' },
  { top: '22%', left: '84%', size: 5, delay: '0.9s' },
  { top: '76%', left: '78%', size: 6, delay: '2.1s' },
];

const HERO_SLIDES: { mode: HoneyStageMode; label: string; shortLabel: string }[] = [
  { mode: 'jar', label: '3D Honey Jar', shortLabel: '3D Jar' },
  { mode: 'pour', label: 'Honey Pouring', shortLabel: 'Pouring' },
  { mode: 'dipper', label: 'Honey Dipper & Bees', shortLabel: 'Dipper' },
  { mode: 'comb', label: 'Honeycomb & Bees', shortLabel: 'Honeycomb' },
];

export function HeroSection({
  brandCode,
  companyName,
  tagline,
  location,
}: HeroSectionProps) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [pourActive, setPourActive] = useState(true);
  const [dipTrigger, setDipTrigger] = useState(0);
  const [combFilling, setCombFilling] = useState(true);
  const [combResetTick, setCombResetTick] = useState(0);
  const [zoomAction, setZoomAction] = useState<{
    type: 'in' | 'out' | 'reset';
    tick: number;
  } | null>(null);

  const currentSlide = HERO_SLIDES[slideIdx % HERO_SLIDES.length];

  const handlePrev = () => {
    setSlideIdx((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const handleNext = () => {
    setSlideIdx((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const triggerZoom = (type: 'in' | 'out' | 'reset') => {
    setZoomAction((prev) => ({ type, tick: (prev?.tick ?? 0) + 1 }));
  };

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-[#160F09] text-[#FAF6EE]"
    >
      {/* Background atmospheric Sirumalai honey image with measured contrast scrim */}
      <div className="pointer-events-none absolute inset-0">
        <img
          src="/src/assets/images/hero_sirumalai_honey_1795429480407.jpg"
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#140D07]/95 via-[#140D07]/82 to-[#140D07]/60" />
      </div>

      {/* Subtle Floating Golden Particles */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {PARTICLES.map((p, idx) => (
          <span
            key={idx}
            style={{
              top: p.top,
              left: p.left,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: p.delay,
            }}
            className="animate-honey-float absolute rounded-full bg-[#F2B705]/65 blur-[0.5px]"
          />
        ))}
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:py-16">
        {/* Left Editorial Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-xs tracking-wide text-[#F2B705]">
            <span className="font-semibold">{brandCode}</span>
            <span aria-hidden="true">·</span>
            <span>{location}</span>
            <span aria-hidden="true">·</span>
            <span>India & Worldwide Delivery</span>
          </div>

          <h1
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.06] tracking-tight text-[#FFF8EC]"
            style={{ textWrap: 'balance' }}
          >
            {companyName}
          </h1>

          <p className="font-display text-2xl sm:text-3xl italic text-[#F2B705]">
            {tagline}
          </p>

          <p className="max-w-xl text-base leading-relaxed text-[#EADBC2]/85">
            Raw, minimally handled wild honey gathered from the forest flora of the Sirumalai hills near Dindigul, Tamil Nadu. Explore all interactive 3D honey experiences, zoom in, pause, or switch views directly beside the bottle.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href="#products"
              className="inline-flex items-center gap-2 rounded-lg bg-[#E59A1A] px-6 py-3.5 text-sm font-semibold text-[#180F07] hover:bg-[#F2B705] transition-colors whitespace-nowrap"
            >
              Shop Now
              <ArrowRight className="h-4 w-4" />
            </a>

            <a
              href="#about"
              className="inline-flex items-center gap-2 rounded-lg border border-[#F2B705]/40 bg-[#23170E]/75 px-6 py-3.5 text-sm font-medium text-[#FAF6EE] hover:border-[#F2B705] hover:bg-[#2E1E12] transition-colors whitespace-nowrap"
            >
              <Sparkles className="h-4 w-4 text-[#F2B705]" />
              Explore Our Honey
            </a>
          </div>
        </div>

        {/* Right Consolidated Interactive 3D Showcase (Tabs + 3D Stage + Controls & Zoom) */}
        <div className="lg:col-span-7 flex flex-col overflow-hidden rounded-2xl border border-[#D98A1C]/30 bg-[#1B120B]/90 shadow-2xl">
          {/* Top Scene Selector Tabs */}
          <div
            className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D98A1C]/20 bg-[#140D07]/95 px-3.5 py-2.5"
            role="tablist"
            aria-label="3D Honey Scenes"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {HERO_SLIDES.map((s, idx) => {
                const active = idx === slideIdx;
                return (
                  <button
                    key={s.mode}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSlideIdx(idx)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#F2B705] text-[#140D07]'
                        : 'bg-[#261910] text-[#F5ECD8]/80 hover:bg-[#362417] hover:text-white'
                    }`}
                  >
                    0{idx + 1} · {s.shortLabel}
                  </button>
                );
              })}
            </div>

            <span className="hidden sm:inline-block font-mono-tabular text-xs text-[#F2B705]/90">
              {slideIdx + 1} / {HERO_SLIDES.length} · {currentSlide.label}
            </span>
          </div>

          {/* 3D Interactive Stage */}
          <div className="relative h-[370px] sm:h-[420px] lg:h-[440px] w-full">
            <HoneyStage3D
              mode={currentSlide.mode}
              isPlaying={isPlaying}
              pourActive={pourActive}
              dipTrigger={dipTrigger}
              combFilling={combFilling}
              combResetTick={combResetTick}
              zoomAction={zoomAction}
              onTogglePour={() => setPourActive((p) => !p)}
              onTriggerDip={() => setDipTrigger((c) => c + 1)}
              variant="hero"
            />

            {/* Left & Right Arrow Buttons */}
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous 3D honey scene"
              className="absolute left-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-[#F2B705]/40 bg-[#160F09]/90 text-[#F2B705] shadow-lg hover:bg-[#E59A1A] hover:text-[#160F09] transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next 3D honey scene"
              className="absolute right-3 top-1/2 z-20 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-[#F2B705]/40 bg-[#160F09]/90 text-[#F2B705] shadow-lg hover:bg-[#E59A1A] hover:text-[#160F09] transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Bottom Interactive Controls & Zoom Strip directly under the 3D Bottle */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[#D98A1C]/20 bg-[#140D07]/95 px-3.5 py-3">
            {/* Mode Actions + Play/Pause */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                aria-label={isPlaying ? 'Pause 3D Animation' : 'Play 3D Animation'}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#F2B705]/45 bg-[#261910] px-3.5 py-2 text-xs font-semibold text-[#FFF8EC] hover:bg-[#3A2719] transition-colors whitespace-nowrap"
              >
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5 text-[#F2B705]" />
                ) : (
                  <Play className="h-3.5 w-3.5 text-[#F2B705]" />
                )}
                {isPlaying ? 'Pause' : 'Play'}
              </button>

              {currentSlide.mode === 'pour' && (
                <button
                  type="button"
                  onClick={() => {
                    setPourActive((p) => !p);
                    setIsPlaying(true);
                  }}
                  className="rounded-lg bg-[#F2B705] px-3.5 py-2 text-xs font-semibold text-[#180F07] hover:bg-[#ffca28] transition-colors whitespace-nowrap"
                >
                  {pourActive ? 'Stop Pouring' : 'Open & Pour Honey'}
                </button>
              )}

              {currentSlide.mode === 'dipper' && (
                <button
                  type="button"
                  onClick={() => {
                    setDipTrigger((c) => c + 1);
                    setIsPlaying(true);
                  }}
                  className="rounded-lg bg-[#F2B705] px-3.5 py-2 text-xs font-semibold text-[#180F07] hover:bg-[#ffca28] transition-colors whitespace-nowrap"
                >
                  Dip & Drip Honey
                </button>
              )}

              {currentSlide.mode === 'comb' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setCombFilling((f) => !f);
                      setIsPlaying(true);
                    }}
                    className="rounded-lg bg-[#F2B705] px-3.5 py-2 text-xs font-semibold text-[#180F07] hover:bg-[#ffca28] transition-colors whitespace-nowrap"
                  >
                    {combFilling ? 'Pause Comb Fill' : 'Resume Comb Fill'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCombFilling(true);
                      setCombResetTick((n) => n + 1);
                      setIsPlaying(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#D98A1C]/35 bg-[#261910] px-3.5 py-2 text-xs font-semibold text-[#FFF8EC] hover:bg-[#3A2719] transition-colors whitespace-nowrap"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-[#F2B705]" />
                    Refill
                  </button>
                </>
              )}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => triggerZoom('in')}
                aria-label="Zoom in 3D view"
                className="inline-flex items-center gap-1 rounded-lg border border-[#D98A1C]/30 bg-[#261910] px-3 py-2 text-xs font-medium text-[#F5ECD8] hover:bg-[#3A2719] transition-colors whitespace-nowrap"
              >
                <ZoomIn className="h-3.5 w-3.5 text-[#F2B705]" />
                Zoom +
              </button>
              <button
                type="button"
                onClick={() => triggerZoom('out')}
                aria-label="Zoom out 3D view"
                className="inline-flex items-center gap-1 rounded-lg border border-[#D98A1C]/30 bg-[#261910] px-3 py-2 text-xs font-medium text-[#F5ECD8] hover:bg-[#3A2719] transition-colors whitespace-nowrap"
              >
                <ZoomOut className="h-3.5 w-3.5 text-[#F2B705]" />
                Zoom -
              </button>
              <button
                type="button"
                onClick={() => triggerZoom('reset')}
                aria-label="Reset 3D camera zoom"
                className="rounded-lg border border-[#D98A1C]/25 bg-[#1E140D] px-2.5 py-2 text-xs font-medium text-[#EADBC2]/85 hover:bg-[#322115] transition-colors whitespace-nowrap"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
