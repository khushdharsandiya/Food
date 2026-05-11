import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowRight } from 'react-icons/fi'
import { features, stats, teamMembers } from '../../assets/dummydata'

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] },
}

const stagger = (i) => ({
  ...fadeUp,
  transition: { ...fadeUp.transition, delay: 0.08 * i },
})

const About = () => {
  return (
    <div className="min-h-screen bg-[#120d09] text-amber-50">
      {/* Ambient background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.12]"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(217,119,6,0.45), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(120,53,15,0.35), transparent), radial-gradient(ellipse 50% 30% at 0% 80%, rgba(180,83,9,0.25), transparent)',
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:pb-24 sm:pt-24 md:pt-28">
        <div className="pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full bg-amber-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-red-950/30 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 font-cinzel text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-500/90 sm:text-xs"
          >
            About us
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-dancingscript text-5xl leading-tight text-amber-100 sm:text-6xl md:text-7xl"
          >
            Foodie
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200 bg-clip-text text-transparent">
              {' '}
              Frenzy
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
            className="mx-auto mt-6 max-w-2xl font-cinzel text-sm leading-relaxed text-amber-200/75 sm:text-base md:text-lg"
          >
            We craft bold flavours and honest comfort food — delivered fast, packed with care, and
            made to feel like your favourite corner kitchen, elevated.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-7 py-3.5 font-cinzel text-sm font-semibold uppercase tracking-wider text-[#1a0f08] shadow-lg shadow-amber-950/40 transition hover:from-amber-400 hover:to-amber-500"
            >
              Explore menu
              <FiArrowRight className="text-lg" />
            </Link>
            <Link
              to="/contact"
              className="rounded-full border border-amber-700/45 bg-[#1a120b]/60 px-7 py-3.5 font-cinzel text-sm font-semibold uppercase tracking-wider text-amber-200/95 backdrop-blur-sm transition hover:border-amber-500/50 hover:bg-amber-950/40"
            >
              Get in touch
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Story band */}
      <section className="relative border-y border-amber-900/35 bg-[#1a120b]/70 px-4 py-14 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl text-center">
          <motion.h2 {...fadeUp} className="font-cinzel text-xs font-semibold uppercase tracking-[0.28em] text-amber-500/85">
            Our story
          </motion.h2>
          <motion.p
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: 0.06 }}
            className="mt-4 font-cinzel text-sm leading-relaxed text-amber-100/80 sm:text-base"
          >
            From spice-forward grills to slow-cooked classics, every plate is built around fresh
            ingredients and recipes we&apos;d serve at our own table. Unforgettable dining —
            straight to your doorstep.
          </motion.p>
        </div>
      </section>

      {/* Features */}
      <section className="relative px-4 py-16 sm:py-20 md:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="mb-12 text-center md:mb-16">
            <h2 className="font-dancingscript text-4xl text-amber-100 sm:text-5xl">Why we&apos;re different</h2>
            <p className="mx-auto mt-3 max-w-xl font-cinzel text-sm text-amber-200/65">
              Three things we never compromise on: speed, skill, and what goes into your bowl.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.article
                  key={f.id}
                  {...stagger(i)}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-amber-700/25 bg-gradient-to-b from-[#2a1f18]/95 to-[#1a120b]/98 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.7)] ring-1 ring-black/30 transition duration-300 hover:border-amber-500/40 hover:shadow-[0_28px_56px_-18px_rgba(217,119,6,0.18)]"
                >
                  <div className="relative p-3 sm:p-3.5">
                    <div
                      className={`relative aspect-[16/10] overflow-hidden rounded-xl shadow-[inset_0_1px_0_0_rgba(251,191,36,0.12),0_12px_40px_-12px_rgba(0,0,0,0.75)] ring-1 ring-amber-600/25 ${
                        f.title === 'Premium Quality' ? 'bg-[#0c0907]' : 'bg-[#1a120b]'
                      }`}
                    >
                      <div className="pointer-events-none absolute inset-0 z-[1] rounded-xl border border-amber-500/15" />
                      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-amber-500/[0.07] via-transparent to-transparent" />
                      <img
                        src={f.img}
                        alt=""
                        className={`relative z-0 h-full w-full transition duration-700 ease-out group-hover:scale-[1.04] ${
                          f.title === 'Premium Quality'
                            ? 'object-contain object-center p-3 sm:p-4'
                            : 'object-cover'
                        }`}
                      />
                      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#1a120b]/95 via-[#1a120b]/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 z-[2] flex items-end p-3 sm:p-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/35 bg-[#1a120b]/90 text-amber-400 shadow-[0_4px_20px_rgba(0,0,0,0.45)] backdrop-blur-md ring-1 ring-amber-400/20">
                          <Icon className="h-5 w-5" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-6 sm:p-7">
                    <h3 className="font-cinzel text-lg font-semibold text-amber-100">{f.title}</h3>
                    <p className="mt-2 flex-1 font-cinzel text-sm leading-relaxed text-amber-200/65">{f.text}</p>
                  </div>
                </motion.article>
              )
            })}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative px-4 py-16 sm:py-20 md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {stats.map((s, i) => {
              const Icon = s.icon
              return (
                <motion.div
                  key={s.label}
                  {...stagger(i)}
                  className="rounded-2xl border border-amber-800/30 bg-[#1f1814]/80 p-6 text-center backdrop-blur-md transition hover:border-amber-600/40 hover:bg-[#241c16]/90 sm:p-8"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-900/35 text-amber-400 ring-1 ring-amber-700/30">
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="font-dancingscript text-3xl text-amber-200 sm:text-4xl">{s.number}</p>
                  <p className="mt-2 font-cinzel text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/80 sm:text-xs">
                    {s.label}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="relative px-4 pb-20 pt-4 sm:pb-28 md:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="mb-12 text-center md:mb-14">
            <h2 className="font-dancingscript text-4xl text-amber-100 sm:text-5xl">
              Meet the <span className="text-amber-400/95">kitchen</span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg font-cinzel text-sm text-amber-200/65">
              The people behind the pass — obsessed with flavour, timing, and your first bite.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
            {teamMembers.map((m, i) => (
              <motion.article
                key={m.name}
                {...stagger(i)}
                className="flex flex-col overflow-hidden rounded-2xl border border-amber-700/25 bg-[#1f1814]/90 shadow-xl ring-1 ring-black/25 transition hover:border-amber-500/40 hover:shadow-[0_24px_48px_-16px_rgba(180,83,9,0.2)]"
              >
                <div className="p-3 sm:p-3.5 pb-0">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[#0f0b08] shadow-[inset_0_1px_0_0_rgba(251,191,36,0.1),0_16px_48px_-16px_rgba(0,0,0,0.8)] ring-1 ring-amber-600/20">
                    <div className="pointer-events-none absolute inset-0 z-[1] rounded-xl border border-amber-400/10" />
                    <img
                      src={m.img}
                      alt=""
                      className="h-full w-full object-cover object-center transition duration-700 ease-out hover:scale-[1.03]"
                    />
                    <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#1a120b] via-transparent to-amber-900/10" />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <h3 className="font-cinzel text-xl font-semibold text-amber-100">{m.name}</h3>
                  <p className="mt-1 text-sm font-medium text-amber-500/95">{m.role}</p>
                  {m.experience && (
                    <p className="mt-2 font-cinzel text-xs text-amber-200/55">{m.experience}</p>
                  )}
                  <p className="mt-4 font-cinzel text-sm leading-relaxed text-amber-200/70">{m.bio}</p>
                  {m.speciality && (
                    <p className="mt-4 border-t border-amber-800/40 pt-4 font-cinzel text-xs text-amber-400/80">
                      <span className="text-amber-500/60">Focus · </span>
                      {m.speciality}
                    </p>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-amber-900/35 bg-gradient-to-r from-[#1a120b] via-[#23180f] to-[#1a120b] px-4 py-14">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h2 className="font-dancingscript text-3xl text-amber-100 sm:text-4xl">Hungry yet?</h2>
          <p className="mt-3 font-cinzel text-sm text-amber-200/65">
            Order your favourites in a few taps — we&apos;ll handle the rest.
          </p>
          <Link
            to="/menu"
            className="mt-8 inline-flex items-center gap-2 rounded-full border-2 border-amber-500/50 bg-amber-500/10 px-8 py-3.5 font-cinzel text-sm font-semibold uppercase tracking-wider text-amber-200 transition hover:bg-amber-500/20"
          >
            Order now
            <FiArrowRight />
          </Link>
        </div>
      </section>
    </div>
  )
}

export default About
