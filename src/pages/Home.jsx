import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BLOOD_GROUPS } from '../lib/blood'
import Reveal from '../components/Reveal'

const FEATURES = [
  {
    icon: '⚡',
    title: 'Emergency priority',
    text: 'High-urgency requests are highlighted so critical needs are never missed.',
  },
  {
    icon: '📍',
    title: 'Location-based search',
    text: 'Find compatible donors within a chosen radius of your hospital.',
  },
  {
    icon: '🟢',
    title: 'Live availability',
    text: 'Donors toggle their availability so hospitals only see ready donors.',
  },
  {
    icon: '🔔',
    title: 'Instant notifications',
    text: 'Donors are notified the moment a matching request arrives.',
  },
  {
    icon: '✅',
    title: 'Verified profiles',
    text: 'Only verified donors and hospitals participate in matching.',
  },
  {
    icon: '📊',
    title: 'Request tracking',
    text: 'Follow every request from pending to completed in one place.',
  },
]

const STEPS = [
  { n: 1, title: 'Register', text: 'Sign up as a donor or a hospital and complete your profile.' },
  { n: 2, title: 'Create a request', text: 'Hospitals post the blood group, units, location and urgency.' },
  { n: 3, title: 'Match donors', text: 'Compatible, available and verified donors are listed instantly.' },
  { n: 4, title: 'Respond & track', text: 'Donors accept or decline; hospitals track progress to completion.' },
]

export default function Home() {
  const { user } = useAuth()
  const dashboard = user?.role === 'donor' ? '/donor' : user?.role === 'hospital' ? '/hospital' : '/register'

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navbar text-white">
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_20%_20%,#DC2626,transparent_45%),radial-gradient(circle_at_80%_0%,#EF4444,transparent_40%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:py-20 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <span className="badge border-white/20 bg-white/10 text-white">Blood donation coordination</span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Every drop connects a hospital to a life-saver.
            </h1>
            <p className="mt-4 max-w-lg text-white/85">
              Blood Bridge links hospitals with compatible, available and verified blood donors —
              reducing the time it takes to find the right match in an emergency.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to={dashboard} className="btn bg-primary text-white hover:bg-primary-dark">
                {user ? 'Go to dashboard' : 'Get started'}
              </Link>
              <a href="#how-it-works" className="btn border border-white/30 bg-white/10 text-white hover:bg-white/20">
                How it works
              </a>
            </div>
          </Reveal>

          <Reveal className="relative" delay={120}>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-sm font-semibold text-white/80">Supported blood groups</p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {BLOOD_GROUPS.map((group) => (
                  <div
                    key={group}
                    className="flex flex-col items-center justify-center rounded-xl bg-white py-3 font-bold text-primary-dark shadow-sm"
                  >
                    <span className="text-lg">{group}</span>
                    <span className="text-[10px] font-medium text-gray-400">
                      {group === 'O-' ? 'universal donor' : group === 'AB+' ? 'universal recipient' : 'group'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <Reveal className="text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Built for speed and clarity</h2>
          <p className="mx-auto mt-2 max-w-2xl text-gray-500">
            A single, accessible platform where hospitals and donors coordinate without friction.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} className="card card-hover p-5" delay={(i % 3) * 80}>
              <span className="text-2xl" aria-hidden="true">
                {f.icon}
              </span>
              <h3 className="mt-3 text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{f.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <Reveal className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">How Blood Bridge works</h2>
            <p className="mx-auto mt-2 max-w-2xl text-gray-500">
              Four steps from registration to a confirmed donation.
            </p>
          </Reveal>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.n} className="card card-hover p-5" delay={i * 70}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{s.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Roles */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal className="card card-hover p-6">
            <h3 className="text-xl font-bold">For donors</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              {[
                'Create a profile with your blood group and location',
                'Toggle your availability whenever you want',
                'See nearby matching requests',
                'Accept or decline in a tap and track your history',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-primary">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/register?role=donor" className="btn-primary mt-6">
              Register as a donor
            </Link>
          </Reveal>
          <Reveal className="card card-hover p-6" delay={100}>
            <h3 className="text-xl font-bold">For hospitals</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              {[
                'Maintain verified hospital profile details',
                'Create emergency requests in seconds',
                'Find compatible donors by radius and availability',
                'Send requests and monitor responses to completion',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-primary">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/register?role=hospital" className="btn-primary mt-6">
              Register as a hospital
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="mx-auto max-w-6xl px-4 pb-4">
        <Reveal className="rounded-xl border border-primary/20 bg-alert px-5 py-4 text-sm text-heading">
          <strong>Important:</strong> Blood Bridge's compatibility matching is preliminary. Actual
          transfusion decisions must always be confirmed by qualified hospital professionals through
          proper blood grouping, antibody screening and crossmatching.
        </Reveal>
      </section>
    </div>
  )
}
