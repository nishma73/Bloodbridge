import { Link } from 'react-router-dom'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-black/5 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-gray-500">
            Connecting hospitals with compatible, available blood donors — quickly and safely.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Quick links</h4>
          <ul className="mt-3 space-y-2 text-sm text-gray-500">
            <li>
              <Link to="/" className="hover:text-primary-dark">
                Home
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-primary-dark">
                Register
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-primary-dark">
                Login
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">For hospitals</h4>
          <ul className="mt-3 space-y-2 text-sm text-gray-500">
            <li>Create emergency requests</li>
            <li>Find compatible donors</li>
            <li>Track donor responses</li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">For donors</h4>
          <ul className="mt-3 space-y-2 text-sm text-gray-500">
            <li>Set your availability</li>
            <li>View nearby requests</li>
            <li>Accept or decline</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-black/5 px-4 py-5">
        <p className="mx-auto max-w-6xl text-xs text-gray-400">
          Blood Bridge provides preliminary compatibility matching only. All transfusion
          decisions must be confirmed by qualified hospital professionals through blood grouping,
          antibody screening and crossmatching.
        </p>
      </div>
    </footer>
  )
}
